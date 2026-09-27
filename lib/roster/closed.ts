// Closed days: which days of a week the shop is shut. They belong to the
// week alone, seven flags Monday first, and a new week starts with every day
// open. A closed day holds no shifts.

import { DAY_NAMES, dayName, weekdayIndex, type IsoDate } from './dates'

/** Where every week starts, and what a week never saved has. */
export const ALL_OPEN = [false, false, false, false, false, false, false]

export function isClosed(closedDays: boolean[], date: IsoDate): boolean {
  return closedDays[weekdayIndex(date)] === true
}

/** The week's closed days with the date's weekday closed, or reopened. */
export function withDayClosed(closedDays: boolean[], date: IsoDate, closed: boolean): boolean[] {
  const day = weekdayIndex(date)
  return closedDays.map((c, i) => (i === day ? closed : c))
}

/** 'Tue, Sun closed this week' for the grid footer, or null when every day is open. */
export function closedThisWeek(closedDays: boolean[]): string | null {
  const shut = DAY_NAMES.filter((_, i) => closedDays[i])
  return shut.length ? `${shut.join(', ')} closed this week` : null
}

/** Why a shift can't go on this date. */
export function dayClosedError(date: IsoDate): string {
  return `${dayName(date)} is closed this week. Click its heading to reopen it.`
}
