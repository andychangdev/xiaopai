// Hours rostered, worked out from the shifts every time and never stored. A
// shift counts end − start, with no breaks. Hours are minutes, like every
// other time, and only become '24h' at the edge.

import type { Shift } from './shifts'
import { formatHours, type Minutes } from './time'

type Timed = Pick<Shift, 'start' | 'end'>

const length = (shifts: Timed[]) => shifts.reduce((total, s) => total + s.end - s.start, 0)

/** One person's hours this week. */
export function hoursFor(staffId: number, shifts: (Timed & Pick<Shift, 'staffId'>)[]): Minutes {
  return length(shifts.filter((s) => s.staffId === staffId))
}

/** Everyone's hours this week. */
export function weekTotal(shifts: Timed[]): Minutes {
  return length(shifts)
}

/**
 * Whether someone's week is more than 20% over or under their expected hours.
 * Nobody without expected hours is either, and nor is anyone with no hours
 * this week: they aren't under, just not on.
 */
export function againstExpected(rostered: Minutes, expectedHours: number | null): 'over' | 'under' | null {
  if (expectedHours === null || rostered === 0) return null
  // In fifths, so the boundaries are whole numbers: 12h × 1.2 isn't exact
  const usual = expectedHours * 60
  if (rostered * 5 > usual * 6) return 'over'
  if (rostered * 5 < usual * 4) return 'under'
  return null
}

/** How far a week is from the expected hours, as a whole percentage. An exact half rounds away from expected. */
export function percentOff(rostered: Minutes, expectedHours: number): number {
  const usual = expectedHours * 60
  // Off by a whole number of minutes, so a half is exact and rounds the same over or under
  return Math.round((Math.abs(rostered - usual) * 100) / usual)
}

/** What each highlight means, for a tooltip or a screen reader. */
export const AGAINST_EXPECTED = {
  over: 'More than 20% over expected hours',
  under: 'More than 20% under expected hours',
}

/** '24h of 24h' for a row heading, or '24h' for someone with no expected hours. */
export function hoursAgainst(rostered: Minutes, expectedHours: number | null): string {
  return expectedHours === null ? formatHours(rostered) : `${formatHours(rostered)} of ${expectedHours}h`
}
