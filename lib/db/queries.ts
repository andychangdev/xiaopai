import 'server-only'
import { asc, count, eq } from 'drizzle-orm'
import type { IsoDate } from '@/lib/roster/dates'
import { rosterRows } from '@/lib/roster/staff'
import { getDb } from './client'
import { leave, naNotes, shifts, staff } from './schema'

/**
 * Everything the grid shows for a week: its rows (everyone active, plus
 * inactive staff with shifts that week) and its shifts.
 */
export function rosterWeek(week: IsoDate) {
  const db = getDb()
  const weekShifts = db
    .select({ id: shifts.id, staffId: shifts.staffId, date: shifts.date, start: shifts.start, end: shifts.end })
    .from(shifts)
    .where(eq(shifts.weekStart, week))
    .all()
  const people = db
    .select({ id: staff.id, name: staff.name, active: staff.active, sortOrder: staff.sortOrder })
    .from(staff)
    .all()
  return { staff: rosterRows(people, weekShifts), shifts: weekShifts }
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

export function hasStaff() {
  return getDb().select({ n: count() }).from(staff).get()!.n > 0
}

export type StaffListRow = ReturnType<typeof staffList>[number]
