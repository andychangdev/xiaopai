'use server'

// Every mutation. These are POST endpoints that anything reaching the app can
// call, so each one checks its input with the same rules the UI uses.

import { and, asc, eq, max } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db/client'
import { staffHistory } from '@/lib/db/queries'
import { naNotes, rosters, shifts, staff } from '@/lib/db/schema'
import { isInWeek, isMonday, type IsoDate } from '@/lib/roster/dates'
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

// Any week's grid, rather than working out which: the pages aren't cached, so
// it costs nothing
const gridChanged = () => revalidatePath('/roster/[week]', 'page')

function checkId(id: unknown): asserts id is number {
  if (!Number.isInteger(id)) throw new Error('Expected a numeric id')
}

function checkWeek(week: unknown): asserts week is IsoDate {
  if (typeof week !== 'string' || !isMonday(week)) throw new Error('Expected a week, named by its Monday')
}

// Text from the client, which a direct POST can leave out or fake
const text = (v: unknown) => (typeof v === 'string' ? v : '')

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
 * A shift in one cell. The first shift saved to a week creates the week's
 * roster, as a draft with every day open.
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
  if (typeof date !== 'string' || !isInWeek(week, date)) throw new Error('Expected a date in that week')
  const error = timesError(start, end)
  if (error) return { error }

  const db = getDb()
  const person = db.select({ name: staff.name, active: staff.active }).from(staff).where(eq(staff.id, staffId)).get()
  if (!person) return { error: 'That person is no longer on the staff list.' }
  // Only where the grid gives them a row: inactive staff keep one only on
  // weeks where they already have shifts
  if (
    !person.active &&
    !db.select({ id: shifts.id }).from(shifts).where(and(eq(shifts.weekStart, week), eq(shifts.staffId, staffId))).get()
  ) {
    return { error: `${person.name} is inactive. Tick Active on the Staff page to put them back on the roster.` }
  }
  db.transaction((tx) => {
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
