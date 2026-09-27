import 'server-only'
import { asc, count, eq } from 'drizzle-orm'
import { ALL_OPEN } from '@/lib/roster/closed'
import type { IsoDate } from '@/lib/roster/dates'
import { tradingWeek } from '@/lib/roster/settings'
import { rosterRows } from '@/lib/roster/staff'
import { getDb } from './client'
import { leave, naNotes, rosters, shiftTemplates, shifts, staff, tradingHours } from './schema'

/**
 * Everything the grid shows for a week: its rows (everyone active, plus
 * inactive staff with shifts that week) with their expected hours and
 * availability, its shifts, its N/A notes and its closed days.
 */
export function rosterWeek(week: IsoDate) {
  const db = getDb()
  const weekShifts = db
    .select({ id: shifts.id, staffId: shifts.staffId, date: shifts.date, start: shifts.start, end: shifts.end })
    .from(shifts)
    .where(eq(shifts.weekStart, week))
    .all()
  const people = db
    .select({
      id: staff.id,
      name: staff.name,
      active: staff.active,
      sortOrder: staff.sortOrder,
      expectedHours: staff.expectedHours,
      available: staff.available,
    })
    .from(staff)
    .all()
  const notes = db
    .select({ staffId: naNotes.staffId, date: naNotes.date })
    .from(naNotes)
    .where(eq(naNotes.weekStart, week))
    .all()
  return { staff: rosterRows(people, weekShifts), shifts: weekShifts, naNotes: notes, closedDays: closedDaysOf(week) }
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

export function hasStaff() {
  return getDb().select({ n: count() }).from(staff).get()!.n > 0
}

export type StaffListRow = ReturnType<typeof staffList>[number]
export type Template = ReturnType<typeof templateList>[number]
