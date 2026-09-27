// Shifts on the grid: which cell each one sits in, and their order there.

import type { IsoDate } from './dates'
import type { Minutes } from './time'

export type Shift = { id: number; staffId: number; date: IsoDate; start: Minutes; end: Minutes }

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
