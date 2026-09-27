// Not available: a note jotted on one cell of one week, "can't do Friday this
// week", so a one-off conversation isn't forgotten. It looks and warns like
// availability's N/A, but it belongs to that week alone and changes nothing
// else: not the person's pattern, not their leave, and not whether the day
// can be rostered.

import { isUsuallyAvailable, notUsuallyAvailableNote } from './availability'
import { dayName, type IsoDate } from './dates'
import { firstName } from './staff'

/** One person marked not available on one day of the week. */
export type NaNote = { staffId: number; date: IsoDate }

/** Why a day shows N/A: marked for this week, or outside the person's usual pattern. */
export type NaReason = 'marked' | 'usual'

/** Why this person's day shows N/A, or null when it doesn't. A note wins over the pattern. */
export function naReason(
  person: { id: number; available: boolean[] },
  date: IsoDate,
  naNotes: NaNote[],
): NaReason | null {
  if (naNotes.some((n) => n.staffId === person.id && n.date === date)) return 'marked'
  return isUsuallyAvailable(person.available, date) ? null : 'usual'
}

/** "John — marked not available this Fri", or the availability note, for the cell. */
export function naNote(reason: NaReason, name: string, date: IsoDate): string {
  if (reason === 'usual') return notUsuallyAvailableNote(name, date)
  return `${firstName(name)} — marked not available this ${dayName(date)}`
}

/** Why a day outside someone's pattern takes no note: it's N/A already. */
export function alreadyNaNote(name: string, date: IsoDate): string {
  return `Already N/A — ${firstName(name)} isn't usually available on ${dayName(date)}. Change that on the Staff page.`
}

/** Why this day can't be marked, or null when it can. A note on top of the pattern would say nothing new. */
export function markNaError(person: { name: string; available: boolean[] }, date: IsoDate): string | null {
  return isUsuallyAvailable(person.available, date) ? null : alreadyNaNote(person.name, date)
}
