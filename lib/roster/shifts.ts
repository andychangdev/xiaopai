// Shifts on the grid: which cell each one sits in, and their order there.

import type { IsoDate } from './dates'
import type { Minutes } from './time'

export type Shift = { id: number; staffId: number; date: IsoDate; start: Minutes; end: Minutes }

/** A shift that hasn't been saved yet, so has no id. */
export type NewShift = Omit<Shift, 'id'>

/** One person on one day. */
export const cellKey = (staffId: number, date: IsoDate) => `${staffId}|${date}`

/** The week's shifts filed by cell, each cell's stacked in start-time order. */
export function shiftsByCell<T extends Shift>(shifts: T[]): Map<string, T[]> {
  const cells = new Map<string, T[]>()
  for (const s of [...shifts].sort((a, b) => a.start - b.start || a.id - b.id)) {
    const key = cellKey(s.staffId, s.date)
    const cell = cells.get(key)
    if (cell) cell.push(s)
    else cells.set(key, [s])
  }
  return cells
}

/**
 * The shift a copy puts in a cell: the same times, for that person on that
 * day, alongside whatever is there. The original isn't touched. Null when the
 * cell already holds those times, as the one it came from does, where a copy
 * would only sit on top of them.
 */
export function copyShift(
  shift: Shift,
  to: { staffId: number; date: IsoDate },
  inCell: Shift[],
): NewShift | null {
  if (inCell.some((s) => s.start === shift.start && s.end === shift.end)) return null
  return { staffId: to.staffId, date: to.date, start: shift.start, end: shift.end }
}
