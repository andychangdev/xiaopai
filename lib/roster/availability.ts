// Availability: the weekdays someone can normally work, seven flags Monday
// first, the same every week. A day outside it shows N/A on the grid. It's a
// habit, not a rule, so the day can still be rostered, and doing so only warns.

import { dayName, weekdayIndex, type IsoDate } from './dates'
import { firstName } from './staff'

export function isUsuallyAvailable(available: boolean[], date: IsoDate): boolean {
  return available[weekdayIndex(date)] !== false
}

/** The pattern with one weekday (0 = Mon) put in or taken out. */
export function withDayAvailable(available: boolean[], weekday: number, on: boolean): boolean[] {
  return available.map((a, i) => (i === weekday ? on : a))
}

/** "John — isn't usually available on Sun", for the cell. */
export function notUsuallyAvailableNote(name: string, date: IsoDate): string {
  return `${firstName(name)} — isn't usually available on ${dayName(date)}`
}
