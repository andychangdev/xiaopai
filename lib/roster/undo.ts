// Undo: taking back the grid's last action on a week, Clear week and Copy
// previous week included. Each action remembers the week as it found it and
// as it left it. Undo puts back the first, but only while the week is still
// the second, so it never overwrites something done since from outside the
// grid, such as leave booked on the Staff page. Publishing isn't a grid
// action, and whether a week has changed since it went out is worked out
// afresh, so undoing the only edit to a published week makes it Published.

import { dayName, weekRange, type IsoDate } from './dates'
import type { Leave } from './leave'
import type { Shift } from './shifts'
import { formatRange, type Minutes } from './time'

/** Everything a grid action can change on one week, and the leave during it. */
export type WeekState = {
  closedDays: boolean[]
  shifts: (Shift & { note: string | null })[]
  naNotes: { id: number; staffId: number; date: IsoDate }[]
  /** Never put back, as only the Staff page books it, but a change to it means the week has moved on */
  leave: Pick<Leave, 'id' | 'staffId' | 'fromDate' | 'toDate'>[]
}

/** One grid action: what it was, and the week either side of it. */
export type Step = { label: string; before: WeekState; after: WeekState }

/** How many actions back Undo can go on one week. */
export const UNDO_LIMIT = 50

export const NOTHING_TO_UNDO = "There's nothing on this week to undo."

/** The week as one string, rows in id order, so two readings of it compare whatever order they came in. */
function weekKey({ closedDays, shifts, naNotes, leave }: WeekState): string {
  const byId = <T extends { id: number }>(rows: T[]) => [...rows].sort((a, b) => a.id - b.id)
  return JSON.stringify([
    closedDays.map(Boolean),
    byId(shifts).map((s) => [s.id, s.staffId, s.date, s.start, s.end, s.note]),
    byId(naNotes).map((n) => [n.id, n.staffId, n.date]),
    byId(leave).map((l) => [l.id, l.staffId, l.fromDate, l.toDate]),
  ])
}

export function sameWeek(a: WeekState, b: WeekState): boolean {
  return weekKey(a) === weekKey(b)
}

/**
 * The week's history with this action on the end. One that changed nothing
 * leaves it as it was. If the week changed since the last action, somewhere
 * other than the grid, the history starts again from this one, since taking
 * back those before it would undo that change too.
 */
export function remember(history: Step[], step: Step): Step[] {
  if (sameWeek(step.before, step.after)) return history
  const last = history.at(-1)
  if (last && !sameWeek(last.after, step.before)) return [step]
  return [...history, step].slice(-UNDO_LIMIT)
}

/**
 * The action Undo would take back: the last one, while the week is still as
 * it left it and everyone it would put back is still on the staff list.
 * Otherwise nothing.
 */
export function nextUndo(history: Step[], now: WeekState, staffIds: Set<number>): Step | null {
  const last = history.at(-1)
  if (!last || !sameWeek(last.after, now)) return null
  const { shifts, naNotes } = last.before
  return [...shifts, ...naNotes].every((row) => staffIds.has(row.staffId)) ? last : null
}

type Times = { start: Minutes; end: Minutes }

/** A grid action, as told to describeAction. */
export type GridAction =
  | { kind: 'add' | 'remove'; name: string; shift: Times & { date: IsoDate } }
  | { kind: 'change'; name: string; shift: Times & { date: IsoDate }; to: Times }
  | { kind: 'clear' }
  | { kind: 'copy'; from: IsoDate }
  | { kind: 'close' | 'reopen'; date: IsoDate }
  | { kind: 'markNa' | 'clearNa'; name: string; date: IsoDate }

/** What the Undo button would take back, to follow 'Undo': 'adding 10:00–18:00 for John Reyes on Mon'. */
export function describeAction(action: GridAction): string {
  switch (action.kind) {
    case 'add':
    case 'remove': {
      const { name, shift } = action
      const verb = action.kind === 'add' ? 'adding' : 'removing'
      return `${verb} ${formatRange(shift.start, shift.end)} for ${name} on ${dayName(shift.date)}`
    }
    case 'change': {
      const { name, shift, to } = action
      const [from, day] = [formatRange(shift.start, shift.end), dayName(shift.date)]
      return `changing ${name}'s ${day} ${from} to ${formatRange(to.start, to.end)}`
    }
    case 'clear':
      return 'clearing the week'
    case 'copy':
      return `copying ${weekRange(action.from)} into this week`
    case 'close':
    case 'reopen':
      return `${action.kind === 'close' ? 'closing' : 'reopening'} ${dayName(action.date)}`
    case 'markNa':
      return `marking ${action.name} N/A on ${dayName(action.date)}`
    case 'clearNa':
      return `clearing ${action.name}'s N/A on ${dayName(action.date)}`
  }
}
