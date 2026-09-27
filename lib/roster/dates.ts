// Week maths and labels. Dates are 'YYYY-MM-DD' strings throughout, and a week
// is named by its Monday. Nothing here reads the clock: today comes in as an
// argument.
//
// Arithmetic goes through Date.UTC purely as a calendar: UTC has no daylight
// saving, so adding a day always lands on the next date.

export type IsoDate = string

/** Monday first, like every weekday array in the app. */
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const pad = (n: number) => String(n).padStart(2, '0')

function toUtc(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function fromUtc(t: Date): IsoDate {
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

/** The date itself if it's a real calendar date, otherwise null. */
export function parseIsoDate(s: string): IsoDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  return fromUtc(toUtc(s)) === s ? s : null
}

/** The local calendar date of a moment, e.g. the server's `new Date()`. */
export function isoDateOf(moment: Date): IsoDate {
  return `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`
}

export function addDays(date: IsoDate, n: number): IsoDate {
  const t = toUtc(date)
  t.setUTCDate(t.getUTCDate() + n)
  return fromUtc(t)
}

/** How many days on from `from` `to` is: 1 for the next day, negative for an earlier one. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000)
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: IsoDate): number {
  return (toUtc(date).getUTCDay() + 6) % 7
}

export function mondayOf(date: IsoDate): IsoDate {
  return addDays(date, -weekdayIndex(date))
}

/** A real date that falls on a Monday, so it can name a week. */
export function isMonday(s: string): boolean {
  return parseIsoDate(s) !== null && weekdayIndex(s) === 0
}

export function weekDates(monday: IsoDate): IsoDate[] {
  return DAY_NAMES.map((_, i) => addDays(monday, i))
}

export function isInWeek(monday: IsoDate, date: string): boolean {
  return weekDates(monday).includes(date)
}

/** The Monday a URL naming a week should show: that date's week, or the fallback's if it isn't a date. */
export function canonicalWeek(param: string, fallback: IsoDate): IsoDate {
  return mondayOf(parseIsoDate(param) ?? fallback)
}

/** 'Mon' */
export function dayName(date: IsoDate): string {
  return DAY_NAMES[weekdayIndex(date)]
}

/** '5 Oct' */
export function shortDate(date: IsoDate): string {
  const t = toUtc(date)
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`
}

/** 'Mon 5 Oct' */
export function dayLabel(date: IsoDate): string {
  return `${dayName(date)} ${shortDate(date)}`
}

/** '5 Oct – 11 Oct' */
export function weekRange(monday: IsoDate): string {
  return `${shortDate(monday)} – ${shortDate(addDays(monday, 6))}`
}

/** '5 – 11 October 2026', or '28 Sep – 4 Oct 2026' when the week crosses a month. */
export function weekTitle(monday: IsoDate): string {
  const sunday = addDays(monday, 6)
  const [a, b] = [toUtc(monday), toUtc(sunday)]
  const [ay, by] = [a.getUTCFullYear(), b.getUTCFullYear()]
  if (ay !== by) return `${shortDate(monday)} ${ay} – ${shortDate(sunday)} ${by}`
  if (a.getUTCMonth() !== b.getUTCMonth()) return `${shortDate(monday)} – ${shortDate(sunday)} ${by}`
  return `${a.getUTCDate()} – ${b.getUTCDate()} ${MONTHS_FULL[b.getUTCMonth()]} ${by}`
}
