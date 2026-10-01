import 'server-only'
import { and, asc, count, eq, gte, inArray, is, lte } from 'drizzle-orm'
import { SQLiteTable, getTableConfig } from 'drizzle-orm/sqlite-core'
import { today } from '@/lib/clock'
import { ALL_OPEN } from '@/lib/roster/closed'
import { DEFAULT_PAY_RATES, type PayRates } from '@/lib/roster/cost'
import { addDays, mondayOf, type IsoDate } from '@/lib/roster/dates'
import { historyRows } from '@/lib/roster/history'
import { landingWeek, needsPublishing, publishState } from '@/lib/roster/publish'
import { rosterDays } from '@/lib/roster/rosterText'
import type { Shift } from '@/lib/roster/shifts'
import { DEFAULT_BUSINESS_NAME, tradingWeek } from '@/lib/roster/settings'
import { rosterRows } from '@/lib/roster/staff'
import { getDb } from './client'
import * as schema from './schema'
import { holidays, leave, naNotes, rosters, settings, shiftTemplates, shifts, staff, tradingHours } from './schema'

/**
 * The week the Roster tab and Share roster open when none is named: the
 * earliest that still needs work, this week or next. A week published and
 * edited since still does.
 */
export function openWeek(): IsoDate {
  return landingWeek(mondayOf(today()), (week) => needsPublishing(rosterWeek(week).publish))
}

// What the grid and History read of shifts, staff and rosters
const shiftColumns = { id: shifts.id, staffId: shifts.staffId, date: shifts.date, start: shifts.start, end: shifts.end }
const staffColumns = {
  id: staff.id,
  name: staff.name,
  active: staff.active,
  sortOrder: staff.sortOrder,
  expectedHours: staff.expectedHours,
  hourlyRate: staff.hourlyRate,
  available: staff.available,
}
const rosterColumns = {
  closedDays: rosters.closedDays,
  status: rosters.status,
  version: rosters.version,
  publishedAt: rosters.publishedAt,
  snapshot: rosters.snapshot,
}

/**
 * Everything the grid shows for a week: its rows (everyone active, plus
 * inactive staff with shifts that week) with their expected hours, hourly
 * rate and availability, its shifts, its N/A notes, the leave booked during it and its
 * closed days. Then, for publishing: its roster, the week day by day as the
 * roster text reads it, and where it stands against what was published.
 */
export function rosterWeek(week: IsoDate) {
  const db = getDb()
  const weekShifts = db.select(shiftColumns).from(shifts).where(eq(shifts.weekStart, week)).all()
  const notes = db
    .select({ staffId: naNotes.staffId, date: naNotes.date })
    .from(naNotes)
    .where(eq(naNotes.weekStart, week))
    .all()
  const roster = db.select(rosterColumns).from(rosters).where(eq(rosters.weekStart, week)).get()
  return {
    ...weekOf(week, weekShifts, db.select(staffColumns).from(staff).all(), roster),
    shifts: weekShifts,
    naNotes: notes,
    leave: leaveDuring(week),
    roster,
  }
}

/**
 * A week's rows, closed days and days as the roster text reads them, and so
 * where it stands on publishing. The grid and History both come here, so
 * History's state can't disagree with the badge on the grid.
 */
function weekOf<P extends Parameters<typeof rosterRows>[0][number] & { name: string }>(
  week: IsoDate,
  weekShifts: Shift[],
  people: P[],
  roster: (NonNullable<Parameters<typeof publishState>[0]> & { closedDays: boolean[] }) | undefined,
) {
  const rows = rosterRows(people, weekShifts)
  const closedDays = roster?.closedDays ?? [...ALL_OPEN]
  const days = rosterDays({ weekStart: week, staff: rows, shifts: weekShifts, closedDays })
  return { staff: rows, closedDays, days, publish: publishState(roster, days) }
}

/**
 * Weeks with their shifts and where each stands on publishing, worked out
 * as the grid does: the weeks named, or with none named every week that has
 * a roster (every week with shifts has one). History and the roster's week
 * menu both come here, so neither can disagree with the grid.
 */
function weeksWithState(only?: IsoDate[]) {
  const db = getDb()
  const people = db.select(staffColumns).from(staff).all()
  const byWeek = new Map<IsoDate, Shift[]>()
  const shiftRows = db
    .select({ weekStart: shifts.weekStart, ...shiftColumns })
    .from(shifts)
    .where(only && inArray(shifts.weekStart, only))
    .all()
  for (const { weekStart, ...s } of shiftRows) {
    const week = byWeek.get(weekStart)
    if (week) week.push(s)
    else byWeek.set(weekStart, [s])
  }
  const roster = new Map(
    db
      .select({ weekStart: rosters.weekStart, ...rosterColumns })
      .from(rosters)
      .where(only && inArray(rosters.weekStart, only))
      .all()
      .map(({ weekStart, ...r }) => [weekStart, r]),
  )
  return (only ?? [...roster.keys()]).map((weekStart) => {
    const weekShifts = byWeek.get(weekStart) ?? []
    return { weekStart, shifts: weekShifts, state: weekOf(weekStart, weekShifts, people, roster.get(weekStart)).publish }
  })
}

/** Each of these weeks with its shift count and where it stands, for the roster's week menu. */
export function weekStates(weeks: IsoDate[]) {
  return weeksWithState(weeks).map(({ weekStart, shifts, state }) => ({ weekStart, shifts: shifts.length, state }))
}

/** The History list, around the week you have open. */
export function history(open: IsoDate) {
  return historyRows({ open, weeks: weeksWithState() })
}

/** Every booking with at least one day in the week, whoever it's for. */
export function leaveDuring(week: IsoDate) {
  return getDb()
    .select({ id: leave.id, staffId: leave.staffId, fromDate: leave.fromDate, toDate: leave.toDate, note: leave.note })
    .from(leave)
    .where(and(lte(leave.fromDate, addDays(week, 6)), gte(leave.toDate, week)))
    .all()
}

/** Which days of a week are closed, Monday first. A week never saved has every day open. */
export function closedDaysOf(week: IsoDate): boolean[] {
  const roster = getDb()
    .select({ closedDays: rosters.closedDays })
    .from(rosters)
    .where(eq(rosters.weekStart, week))
    .get()
  return roster?.closedDays ?? [...ALL_OPEN]
}

/** A shift, the week it's filed under and whose it is, while it's still there. */
export function shiftById(id: number) {
  return getDb()
    .select({
      week: shifts.weekStart,
      staffId: shifts.staffId,
      date: shifts.date,
      start: shifts.start,
      end: shifts.end,
      name: staff.name,
    })
    .from(shifts)
    .innerJoin(staff, eq(staff.id, shifts.staffId))
    .where(eq(shifts.id, id))
    .get()
}

/** How many shifts a week has, without loading them. */
export function shiftCount(week: IsoDate) {
  return getDb().select({ n: count() }).from(shifts).where(eq(shifts.weekStart, week)).get()!.n
}

/** Everyone, active or not, in the set order, with what they have on record. */
export function staffList() {
  const historyOf = staffHistory()
  return getDb()
    .select({
      id: staff.id,
      name: staff.name,
      active: staff.active,
      expectedHours: staff.expectedHours,
      hourlyRate: staff.hourlyRate,
      available: staff.available,
      notes: staff.notes,
    })
    .from(staff)
    .orderBy(asc(staff.sortOrder), asc(staff.id))
    .all()
    .map((p) => ({ ...p, history: historyOf(p.id) }))
}

/**
 * What each person has on record: shifts and leave, which stop them being
 * removed, and N/A notes, which go with them if they are.
 */
export function staffHistory() {
  const db = getDb()
  const tally = (rows: { staffId: number; n: number }[]) => new Map(rows.map((r) => [r.staffId, r.n]))
  const shiftN = tally(db.select({ staffId: shifts.staffId, n: count() }).from(shifts).groupBy(shifts.staffId).all())
  const leaveN = tally(db.select({ staffId: leave.staffId, n: count() }).from(leave).groupBy(leave.staffId).all())
  const naN = tally(db.select({ staffId: naNotes.staffId, n: count() }).from(naNotes).groupBy(naNotes.staffId).all())
  return (id: number) => ({ shifts: shiftN.get(id) ?? 0, leave: leaveN.get(id) ?? 0, naNotes: naN.get(id) ?? 0 })
}

/** Every booking, soonest first, with whose it is. */
export function leaveList() {
  return getDb()
    .select({
      id: leave.id,
      staffId: leave.staffId,
      name: staff.name,
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      note: leave.note,
    })
    .from(leave)
    .innerJoin(staff, eq(staff.id, leave.staffId))
    .orderBy(asc(leave.fromDate), asc(leave.toDate), asc(leave.id))
    .all()
}

/** What the business is called, or the placeholder until Settings names it. */
export function businessName(): string {
  return getDb().select({ name: settings.businessName }).from(settings).get()?.name ?? DEFAULT_BUSINESS_NAME
}

/** The weekend and public holiday rates, each a percentage of someone's hourly rate. */
export function payRates(): Omit<PayRates, 'holidays'> {
  const rates = getDb()
    .select({ weekend: settings.weekendRate, holiday: settings.holidayRate })
    .from(settings)
    .get()
  return rates ?? { ...DEFAULT_PAY_RATES }
}

/** The pay rates, with the public holidays in a week, for its cost. */
export function payRatesFor(week: IsoDate): PayRates {
  const during = getDb()
    .select({ date: holidays.date, name: holidays.name })
    .from(holidays)
    .where(and(gte(holidays.date, week), lte(holidays.date, addDays(week, 6))))
    .orderBy(asc(holidays.date))
    .all()
  return { ...payRates(), holidays: during }
}

/** Every public holiday, soonest first. */
export function holidayList() {
  return getDb()
    .select({ id: holidays.id, date: holidays.date, name: holidays.name })
    .from(holidays)
    .orderBy(asc(holidays.date))
    .all()
}

/** Opening and closing for each weekday, Monday first. */
export function tradingHoursWeek() {
  return tradingWeek(getDb().select().from(tradingHours).all())
}

/** The shift templates, in the order they were added. */
export function templateList() {
  return getDb()
    .select({ id: shiftTemplates.id, name: shiftTemplates.name, start: shiftTemplates.start, end: shiftTemplates.end })
    .from(shiftTemplates)
    .orderBy(asc(shiftTemplates.sortOrder), asc(shiftTemplates.id))
    .all()
}

/**
 * Every row of every table, for the JSON export, each table in the order of
 * its key. It walks the schema, so a table added later comes along too.
 */
export function everyTable(): Record<string, unknown[]> {
  const db = getDb()
  return Object.fromEntries(
    Object.entries<unknown>(schema)
      .filter((entry): entry is [string, SQLiteTable] => is(entry[1], SQLiteTable))
      .map(([name, table]) => {
        const key = getTableConfig(table).columns.filter((c) => c.primary)
        return [name, db.select().from(table).orderBy(...key.map((c) => asc(c))).all()]
      }),
  )
}

export function hasStaff() {
  return getDb().select({ n: count() }).from(staff).get()!.n > 0
}

export type StaffListRow = ReturnType<typeof staffList>[number]
export type LeaveListRow = ReturnType<typeof leaveList>[number]
export type HolidayListRow = ReturnType<typeof holidayList>[number]
export type Template = ReturnType<typeof templateList>[number]
