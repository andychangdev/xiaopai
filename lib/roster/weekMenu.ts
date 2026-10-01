// The roster's week menu: the weeks around this one, each with where it
// stands, so you can jump straight to one without stepping a week at a time
// or going through History.

import { addDays, daysBetween, weekNumber, type IsoDate } from './dates'
import type { PublishState } from './publish'

export type WeekMenuItem = {
  weekStart: IsoDate
  /** 'This week', 'Next week', 'Last week', or 'Week 42' */
  label: string
  /** The week on screen */
  open: boolean
  /** Null for an empty week: no shifts, and never published */
  state: PublishState | null
}

// How many weeks either side of this one the menu reaches
const AHEAD = 2
const BEHIND = 4

/**
 * The weeks the menu offers, newest first: two after this week, this week,
 * and four before it. The open week is always among them, in date order,
 * however far away it is.
 */
export function menuWeeks(thisWeek: IsoDate, open: IsoDate): IsoDate[] {
  const weeks = Array.from({ length: AHEAD + 1 + BEHIND }, (_, i) => addDays(thisWeek, (AHEAD - i) * 7))
  if (!weeks.includes(open)) weeks.push(open)
  return weeks.sort().reverse()
}

const NEAR: Record<number, string> = { 1: 'Next week', 0: 'This week', [-1]: 'Last week' }

/**
 * Each week as the menu shows it. A week published and emptied since keeps
 * its state, as staff still hold what went out; only one with nothing on it
 * and never published is empty.
 */
export function weekMenu({
  thisWeek,
  open,
  weeks,
}: {
  thisWeek: IsoDate
  open: IsoDate
  /** The weeks from menuWeeks, in its order, with their shift counts and states */
  weeks: { weekStart: IsoDate; shifts: number; state: PublishState }[]
}): WeekMenuItem[] {
  return weeks.map(({ weekStart, shifts, state }) => ({
    weekStart,
    label: NEAR[daysBetween(thisWeek, weekStart) / 7] ?? `Week ${weekNumber(weekStart)}`,
    open: weekStart === open,
    state: shifts === 0 && state.status === 'draft' ? null : state,
  }))
}
