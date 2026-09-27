'use server'

// Every mutation. These are POST endpoints that anything reaching the app can
// call, so each one checks its input with the same rules the UI uses.

import { and, asc, count, eq, gte, lte, max } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { today } from '@/lib/clock'
import { getDb } from '@/lib/db/client'
import { closedDaysOf, leaveDuring, rosterWeek, staffHistory, tradingHoursWeek } from '@/lib/db/queries'
import { leave, naNotes, rosters, shiftTemplates, shifts, staff, tradingHours } from '@/lib/db/schema'
import { withDayAvailable } from '@/lib/roster/availability'
import { dayClosedError, isClosed, withDayClosed } from '@/lib/roster/closed'
import { copyReport, nothingToCopy, planCopy } from '@/lib/roster/copy'
import { isInWeek, isMonday, type IsoDate } from '@/lib/roster/dates'
import { leaveOn, onLeaveError, overlapError, parseLeave } from '@/lib/roster/leave'
import { markNaError } from '@/lib/roster/notAvailable'
import { NOTHING_TO_PUBLISH, nothingToPublish, publishState, snapshotOf } from '@/lib/roster/publish'
import { rosterDays } from '@/lib/roster/rosterText'
import { NEW_TEMPLATE, tradingHoursError } from '@/lib/roster/settings'
import {
  EVERY_DAY,
  HOURS_INVALID,
  NAME_REQUIRED,
  moveInOrder,
  parseExpectedHours,
  parseName,
  parseNotes,
  whyNotRemovable,
} from '@/lib/roster/staff'
import { timesError } from '@/lib/roster/time'

export type ActionResult = { error?: string }

// Staff show on every page, so a change to them refreshes everything
const staffChanged = () => revalidatePath('/', 'layout')

// Any week's grid and its roster text, rather than working out which: the
// pages aren't cached, so it costs nothing
const gridChanged = () => {
  revalidatePath('/roster/[week]', 'page')
  revalidatePath('/share/[week]', 'page')
}

// Settings reach every grid (the footer, the popover's templates) as well as
// the Settings page itself
const settingsChanged = () => revalidatePath('/', 'layout')

function checkId(id: unknown): asserts id is number {
  if (!Number.isInteger(id)) throw new Error('Expected a numeric id')
}

function checkWeek(week: unknown): asserts week is IsoDate {
  if (typeof week !== 'string' || !isMonday(week)) throw new Error('Expected a week, named by its Monday')
}

function checkDate(week: IsoDate, date: unknown): asserts date is IsoDate {
  if (typeof date !== 'string' || !isInWeek(week, date)) throw new Error('Expected a date in that week')
}

function checkWeekday(weekday: unknown): asserts weekday is number {
  if (typeof weekday !== 'number' || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new Error('Expected a weekday, 0 for Monday')
  }
}

// Text from the client, which a direct POST can leave out or fake
const text = (v: unknown) => (typeof v === 'string' ? v : '')

/**
 * Someone with a row on the week's grid, or why they have none. Inactive
 * staff keep one only on weeks where they already have shifts.
 */
function gridRow(week: IsoDate, staffId: number): { error: string } | { name: string; available: boolean[] } {
  const db = getDb()
  const person = db
    .select({ name: staff.name, active: staff.active, available: staff.available })
    .from(staff)
    .where(eq(staff.id, staffId))
    .get()
  if (!person) return { error: 'That person is no longer on the staff list.' }
  if (
    !person.active &&
    !db.select({ id: shifts.id }).from(shifts).where(and(eq(shifts.weekStart, week), eq(shifts.staffId, staffId))).get()
  ) {
    return { error: `${person.name} is inactive. Tick Active on the Staff page to put them back on the roster.` }
  }
  return person
}

export async function addStaff(input: { name: string; expectedHours: string; notes: string }): Promise<ActionResult> {
  const name = parseName(text(input?.name))
  if (!name) return { error: NAME_REQUIRED }
  const hours = parseExpectedHours(text(input?.expectedHours))
  if (!hours.ok) return { error: HOURS_INVALID }

  const db = getDb()
  const last = db.select({ n: max(staff.sortOrder) }).from(staff).get()?.n ?? -1
  db.insert(staff)
    .values({
      name,
      expectedHours: hours.value,
      notes: parseNotes(text(input?.notes)),
      available: EVERY_DAY,
      sortOrder: last + 1,
    })
    .run()
  staffChanged()
  return {}
}

export async function updateStaff(
  id: number,
  patch: { name?: string; expectedHours?: string; notes?: string; active?: boolean },
): Promise<ActionResult> {
  checkId(id)
  const { name, expectedHours, notes, active } = patch ?? {}
  const set: Partial<typeof staff.$inferInsert> = {}
  if (name !== undefined) {
    const parsed = parseName(text(name))
    if (!parsed) return { error: NAME_REQUIRED }
    set.name = parsed
  }
  if (expectedHours !== undefined) {
    const hours = parseExpectedHours(text(expectedHours))
    if (!hours.ok) return { error: HOURS_INVALID }
    set.expectedHours = hours.value
  }
  if (notes !== undefined) set.notes = parseNotes(text(notes))
  if (active !== undefined) set.active = active === true

  if (Object.keys(set).length) {
    getDb().update(staff).set(set).where(eq(staff.id, id)).run()
    staffChanged()
  }
  return {}
}

/** One weekday in or out of someone's usual pattern. Shifts already on the grid stay as they are. */
export async function setAvailable(id: number, weekday: number, available: boolean): Promise<ActionResult> {
  checkId(id)
  checkWeekday(weekday)
  if (typeof available !== 'boolean') throw new Error('Expected available to be true or false')

  getDb().transaction((tx) => {
    const person = tx.select({ available: staff.available }).from(staff).where(eq(staff.id, id)).get()
    if (!person) return
    tx.update(staff)
      .set({ available: withDayAvailable(person.available, weekday, available) })
      .where(eq(staff.id, id))
      .run()
  })
  staffChanged()
  return {}
}

export async function moveStaff(id: number, dir: -1 | 1): Promise<ActionResult> {
  checkId(id)
  if (dir !== -1 && dir !== 1) throw new Error('Expected a direction of -1 or 1')

  const db = getDb()
  const ids = db.select({ id: staff.id }).from(staff).orderBy(asc(staff.sortOrder), asc(staff.id)).all()
  const before = ids.map((p) => p.id)
  const order = moveInOrder(before, id, dir)
  if (order.every((staffId, i) => staffId === before[i])) return {}
  // Rewrite the whole order, which also evens out any gaps a removal left
  db.transaction((tx) => {
    order.forEach((staffId, i) => tx.update(staff).set({ sortOrder: i }).where(eq(staff.id, staffId)).run())
  })
  staffChanged()
  return {}
}

/** Only for a record with no history, like a typo. Anyone else is deactivated instead. */
export async function removeStaff(id: number): Promise<ActionResult> {
  checkId(id)
  const db = getDb()
  const person = db.select().from(staff).where(eq(staff.id, id)).get()
  if (!person) return {}
  const reason = whyNotRemovable(person, staffHistory()(id))
  if (reason) return { error: reason }

  db.transaction((tx) => {
    // N/A notes are jottings, not history, so they go with the record
    tx.delete(naNotes).where(eq(naNotes.staffId, id)).run()
    tx.delete(staff).where(eq(staff.id, id)).run()
  })
  staffChanged()
  return {}
}

/**
 * Books leave, which is only ever done from the Staff page. Shifts already
 * inside it are the manager's call: a booking over any comes back with how
 * many, and only goes in once told to remove them or keep them. Kept shifts
 * stay on the roster, and warn.
 */
export async function bookLeave(input: {
  staffId: number
  from: string
  to: string
  note: string
  shifts?: 'remove' | 'keep'
}): Promise<ActionResult & { clashes?: number }> {
  const { staffId, shifts: inside } = input ?? {}
  checkId(staffId)
  if (inside !== undefined && inside !== 'remove' && inside !== 'keep') {
    throw new Error("Expected shifts to be 'remove' or 'keep'")
  }
  const booking = parseLeave({ from: text(input?.from), to: text(input?.to), note: text(input?.note) })
  if ('error' in booking) return booking

  const db = getDb()
  const person = db.select({ name: staff.name, active: staff.active }).from(staff).where(eq(staff.id, staffId)).get()
  if (!person) return { error: 'That person is no longer on the staff list.' }
  if (!person.active) return { error: `${person.name} is inactive. Tick Active to book leave for them.` }
  const theirs = db
    .select({ fromDate: leave.fromDate, toDate: leave.toDate })
    .from(leave)
    .where(eq(leave.staffId, staffId))
    .all()
  const overlap = overlapError(person.name, booking, theirs)
  if (overlap) return { error: overlap }

  const during = and(eq(shifts.staffId, staffId), gte(shifts.date, booking.fromDate), lte(shifts.date, booking.toDate))
  const clashes = db.select({ n: count() }).from(shifts).where(during).get()!.n
  if (clashes && !inside) return { clashes }

  db.transaction((tx) => {
    if (inside === 'remove') tx.delete(shifts).where(during).run()
    tx.insert(leave).values({ staffId, ...booking }).run()
  })
  staffChanged()
  return {}
}

/** Takes a booking off, so those days can take shifts again. Nothing else changes. */
export async function cancelLeave(id: number): Promise<ActionResult> {
  checkId(id)
  getDb().delete(leave).where(eq(leave.id, id)).run()
  staffChanged()
  return {}
}

/**
 * A shift in one cell, on a day that's open and that the person isn't on
 * leave. The first shift saved to a week creates the week's roster, as a
 * draft with every day open.
 */
export async function addShift(input: {
  week: string
  staffId: number
  date: string
  start: number
  end: number
}): Promise<ActionResult> {
  const { week, staffId, date, start, end } = input ?? {}
  checkWeek(week)
  checkId(staffId)
  checkDate(week, date)
  const error = timesError(start, end)
  if (error) return { error }
  // Typed, from a template or pasted, a single shift comes through here
  if (isClosed(closedDaysOf(week), date)) return { error: dayClosedError(date) }

  const row = gridRow(week, staffId)
  if ('error' in row) return row
  const away = leaveOn(leaveDuring(week), staffId, date)
  if (away) return { error: onLeaveError(row.name, away) }
  getDb().transaction((tx) => {
    tx.insert(rosters).values({ weekStart: week }).onConflictDoNothing().run()
    tx.insert(shifts).values({ weekStart: week, staffId, date, start, end }).run()
  })
  gridChanged()
  return {}
}

export async function updateShift(id: number, times: { start: number; end: number }): Promise<ActionResult> {
  checkId(id)
  const { start, end } = times ?? {}
  const error = timesError(start, end)
  if (error) return { error }

  const { changes } = getDb().update(shifts).set({ start, end }).where(eq(shifts.id, id)).run()
  gridChanged()
  return changes ? {} : { error: 'That shift has already been removed.' }
}

export async function removeShift(id: number): Promise<ActionResult> {
  checkId(id)
  getDb().delete(shifts).where(eq(shifts.id, id)).run()
  gridChanged()
  return {}
}

/** Every shift in the week. Leave, N/A notes and closed days aren't shifts, so they stay. */
export async function clearWeek(week: string): Promise<ActionResult> {
  checkWeek(week)
  getDb().delete(shifts).where(eq(shifts.weekStart, week)).run()
  gridChanged()
  return {}
}

/**
 * Marks someone not available on one day of one week, or clears it. It's a
 * note: shifts already there stay, and nothing outside this week changes. A
 * day their availability rules out is N/A already, and a day they're on
 * leave says more than a note could, so neither takes one. The note is about
 * the person rather than the day, so whether the shop is open doesn't come
 * into it.
 */
export async function setMarkedNa(input: {
  week: string
  staffId: number
  date: string
  marked: boolean
}): Promise<ActionResult> {
  const { week, staffId, date, marked } = input ?? {}
  checkWeek(week)
  checkId(staffId)
  checkDate(week, date)
  if (typeof marked !== 'boolean') throw new Error('Expected marked to be true or false')

  const db = getDb()
  if (!marked) {
    db.delete(naNotes)
      .where(and(eq(naNotes.weekStart, week), eq(naNotes.staffId, staffId), eq(naNotes.date, date)))
      .run()
    gridChanged()
    return {}
  }
  const row = gridRow(week, staffId)
  if ('error' in row) return row
  const away = leaveOn(leaveDuring(week), staffId, date)
  if (away) return { error: onLeaveError(row.name, away) }
  const error = markNaError(row, date)
  if (error) return { error }
  db.transaction((tx) => {
    tx.insert(rosters).values({ weekStart: week }).onConflictDoNothing().run()
    tx.insert(naNotes).values({ weekStart: week, staffId, date }).onConflictDoNothing().run()
  })
  gridChanged()
  return {}
}

/**
 * Closes one day of one week, or reopens it. A closed day holds no shifts, so
 * closing it removes the ones on it. N/A notes stay, out of sight: they're
 * about the person, so they still hold if the day reopens. Other weeks never
 * change.
 */
export async function setDayClosed(input: { week: string; date: string; closed: boolean }): Promise<ActionResult> {
  const { week, date, closed } = input ?? {}
  checkWeek(week)
  checkDate(week, date)
  if (typeof closed !== 'boolean') throw new Error('Expected closed to be true or false')

  const db = getDb()
  db.transaction((tx) => {
    const closedDays = withDayClosed(closedDaysOf(week), date, closed)
    tx.insert(rosters)
      .values({ weekStart: week, closedDays })
      .onConflictDoUpdate({ target: rosters.weekStart, set: { closedDays } })
      .run()
    if (closed) tx.delete(shifts).where(and(eq(shifts.weekStart, week), eq(shifts.date, date))).run()
  })
  gridChanged()
  return {}
}

/**
 * Publishes the week as it stands: freezes it as the next version, dated
 * today, for Roster text to show from then on. Warnings never stop it. A
 * week already published and unchanged since stays as it is, rather than
 * going up a version for nothing.
 */
export async function publishWeek(week: string): Promise<ActionResult> {
  checkWeek(week)
  const { staff, shifts, closedDays, roster } = rosterWeek(week)
  const days = rosterDays({ weekStart: week, staff, shifts, closedDays })
  const state = publishState(roster, days)
  if (nothingToPublish(state, shifts.length)) return { error: NOTHING_TO_PUBLISH }
  if (state.status === 'published' && !state.changed) return {}

  const previous = state.status === 'published' ? state : null
  const snapshot = snapshotOf({ weekStart: week, days, today: today(), previous })
  // A week with shifts always has its roster: the first shift made it
  getDb()
    .update(rosters)
    .set({ status: 'published', version: snapshot.version, publishedAt: snapshot.publishedAt, snapshot })
    .where(eq(rosters.weekStart, week))
    .run()
  gridChanged()
  return {}
}

/**
 * Replaces one week's shifts with a copy of another's, each on the same
 * weekday for the same person, less the ones planCopy skips, such as any
 * landing on leave. The other week's closed days replace this week's, but its
 * N/A notes don't come across: this week's are its own, and stay. A copy with
 * nothing to bring across changes nothing, rather than emptying the week.
 */
export async function copyWeek(input: { from: string; to: string }): Promise<ActionResult & { report?: string }> {
  const { from, to } = input ?? {}
  checkWeek(from)
  checkWeek(to)
  if (from === to) throw new Error('Expected two different weeks')

  const db = getDb()
  const source = db
    .select({ staffId: shifts.staffId, date: shifts.date, start: shifts.start, end: shifts.end })
    .from(shifts)
    .where(eq(shifts.weekStart, from))
    .orderBy(asc(shifts.id))
    .all()
  const plan = planCopy({
    from: source,
    closedDays: closedDaysOf(from),
    to,
    staff: db.select({ id: staff.id, active: staff.active }).from(staff).all(),
    leave: leaveDuring(to),
  })
  if (!plan.shifts.length) return { error: nothingToCopy(from, plan.skipped) }

  const closedBefore = closedDaysOf(to)
  const { closedDays } = plan
  db.transaction((tx) => {
    tx.insert(rosters)
      .values({ weekStart: to, closedDays })
      .onConflictDoUpdate({ target: rosters.weekStart, set: { closedDays } })
      .run()
    tx.delete(shifts).where(eq(shifts.weekStart, to)).run()
    tx.insert(shifts).values(plan.shifts.map((s) => ({ weekStart: to, ...s }))).run()
  })
  gridChanged()
  return { report: copyReport(plan, from, closedBefore) }
}

/** One weekday's opening or closing time, or both. A day with nothing stored starts from its default. */
export async function setTradingHours(weekday: number, patch: { open?: number; close?: number }): Promise<ActionResult> {
  checkWeekday(weekday)
  const { open, close } = patch ?? {}

  const day = tradingHoursWeek()[weekday]
  if (open !== undefined) day.open = open
  if (close !== undefined) day.close = close
  const error = tradingHoursError(day.open, day.close)
  if (error) return { error }

  getDb()
    .insert(tradingHours)
    .values({ weekday, ...day })
    .onConflictDoUpdate({ target: tradingHours.weekday, set: day })
    .run()
  settingsChanged()
  return {}
}

/** A new template at the end of the list, ready to be renamed. */
export async function addTemplate(): Promise<ActionResult & { id?: number }> {
  const db = getDb()
  const last = db.select({ n: max(shiftTemplates.sortOrder) }).from(shiftTemplates).get()?.n ?? -1
  const { id } = db
    .insert(shiftTemplates)
    .values({ ...NEW_TEMPLATE, sortOrder: last + 1 })
    .returning({ id: shiftTemplates.id })
    .get()
  settingsChanged()
  return { id }
}

/** Shifts copy a template's times when placed, so changing it never touches them. */
export async function updateTemplate(
  id: number,
  patch: { name?: string; start?: number; end?: number },
): Promise<ActionResult> {
  checkId(id)
  const { name, start, end } = patch ?? {}
  const db = getDb()
  const template = db.select().from(shiftTemplates).where(eq(shiftTemplates.id, id)).get()
  if (!template) return { error: 'That template has already been removed.' }

  const set: Partial<typeof shiftTemplates.$inferInsert> = {}
  if (name !== undefined) {
    const parsed = parseName(text(name))
    if (!parsed) return { error: NAME_REQUIRED }
    set.name = parsed
  }
  if (start !== undefined) set.start = start
  if (end !== undefined) set.end = end
  // What it would become, so a start or end sent as null is refused, not filled in
  const times = { ...template, ...set }
  const error = timesError(times.start, times.end)
  if (error) return { error }

  if (Object.keys(set).length) {
    db.update(shiftTemplates).set(set).where(eq(shiftTemplates.id, id)).run()
    settingsChanged()
  }
  return {}
}

/** Shifts placed from it keep their times: they never pointed at it. */
export async function removeTemplate(id: number): Promise<ActionResult> {
  checkId(id)
  getDb().delete(shiftTemplates).where(eq(shiftTemplates.id, id)).run()
  settingsChanged()
  return {}
}
