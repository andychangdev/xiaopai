import { isoDateOf, type IsoDate } from './roster/dates'

// The one place the app reads the clock. Everything in lib/roster takes the
// date as an argument instead.
export function today(): IsoDate {
  return isoDateOf(new Date())
}
