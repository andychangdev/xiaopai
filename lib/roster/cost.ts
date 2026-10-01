// The week's cost, as an estimate: each person's hours at their hourly rate,
// raised on weekends and public holidays by the percentages in Settings. No
// other penalty rates, and nothing else payroll would work out, since payroll
// is out of scope. Worked out from the shifts every time, like hours. A rate
// is whole cents (2850 = $28.50), and a cost is whole dollars, as exact as an
// estimate needs.

import { dayName, fullDate, parseIsoDate, weekdayIndex, type IsoDate } from './dates'
import { hoursFor } from './hours'
import type { Shift } from './shifts'
import { firstName } from './staff'

export type Cents = number

/** Of someone's hourly rate: 125 is time and a quarter. */
export type Percent = number

export type Holiday = { date: IsoDate; name: string | null }

/** The weekend and public holiday rates, each a percentage of someone's hourly rate, and the public holidays. */
export type PayRates = { weekend: Percent; holiday: Percent; holidays: Holiday[] }

type Priced = { id: number; name: string; hourlyRate: Cents | null }

type Timed = Pick<Shift, 'staffId' | 'date' | 'start' | 'end'>

export const MAX_HOURLY_RATE = 200
export const RATE_INVALID = `Hourly rate is an amount up to $${MAX_HOURLY_RATE}, like 28.50, or blank for none.`

/** Blank means no rate. Otherwise dollars, with cents to two places and a '$' if you like, above $0 and up to $200. */
export function parseHourlyRate(input: string): { ok: true; value: Cents | null } | { ok: false } {
  const s = input.trim()
  if (s === '') return { ok: true, value: null }
  const amount = /^\$?(\d+)(?:\.(\d{1,2}))?$/.exec(s)
  if (!amount) return { ok: false }
  // Whole cents from the digits, so 0.1 + 0.2 never comes into it
  const cents = Number(amount[1]) * 100 + Number((amount[2] ?? '').padEnd(2, '0'))
  return cents > 0 && cents <= MAX_HOURLY_RATE * 100 ? { ok: true, value: cents } : { ok: false }
}

/** '$28.50', for the Staff page's rate box. */
export function formatRate(rate: Cents): string {
  return `$${Math.floor(rate / 100)}.${String(rate % 100).padStart(2, '0')}`
}

/** '$2,940' */
export function formatDollars(dollars: number): string {
  return `$${String(dollars).replace(/\B(?=(\d{3})+$)/g, ',')}`
}

/** Until Settings says otherwise, a weekend or holiday costs the same as any other day. */
export const DEFAULT_PAY_RATES = { weekend: 100, holiday: 100 }

export const MAX_PAY_RATE = 500
export const PAY_RATE_INVALID = `A weekend or holiday rate is a whole percentage from 100 to ${MAX_PAY_RATE}, like 125.`

/**
 * A weekend or holiday rate: a whole percentage from 100 to 500, '%'
 * optional. Blank is 100, the usual rate. Null for anything else.
 */
export function parsePayRate(input: string): Percent | null {
  const s = input.trim()
  if (s === '') return 100
  if (!/^\d+%?$/.test(s)) return null
  const n = parseInt(s, 10)
  return n >= 100 && n <= MAX_PAY_RATE ? n : null
}

/** A public holiday as typed in Settings. A blank name is none. */
export function parseHoliday(input: { date: string; name: string }): Holiday | { error: string } {
  const date = parseIsoDate(input.date.trim())
  if (!date) return { error: 'Pick the date of the public holiday.' }
  return { date, name: input.name.trim() || null }
}

/** 'Mon 5 Oct 2026', for Settings' list, which runs across years. */
export function holidayDate(date: IsoDate): string {
  return `${dayName(date)} ${fullDate(date)}`
}

export function holidayTakenError(date: IsoDate): string {
  return `${holidayDate(date)} is already a public holiday.`
}

const isWeekend = (date: IsoDate) => weekdayIndex(date) >= 5

/**
 * What an hour on this date costs, as a percentage of someone's rate: the
 * highest that applies, so a public holiday on a Sunday costs whichever of
 * the two is more.
 */
export function rateOn(date: IsoDate, rates: PayRates): Percent {
  const holiday = rates.holidays.some((h) => h.date === date)
  return Math.max(holiday ? rates.holiday : 100, isWeekend(date) ? rates.weekend : 100)
}

/** What one person's week costs at their rate, to the nearest dollar. Null for someone with no rate. */
export function costFor(staffId: number, shifts: Timed[], hourlyRate: Cents | null, rates: PayRates): number | null {
  if (hourlyRate === null) return null
  const weighted = shifts
    .filter((s) => s.staffId === staffId)
    .reduce((total, s) => total + (s.end - s.start) * rateOn(s.date, rates), 0)
  // Minutes at a percentage of cents an hour come to dollars × 60 × 100 × 100
  return Math.round((weighted * hourlyRate) / 600_000)
}

/**
 * The week's cost: each person's to the nearest dollar, added up, so the
 * total is always the sum of the lines above it. Anyone with no rate is left
 * out.
 */
export function weekCost(staff: Priced[], shifts: Timed[], rates: PayRates): number {
  return staff.reduce((total, p) => total + (costFor(p.id, shifts, p.hourlyRate, rates) ?? 0), 0)
}

/** Anyone on the week with no rate, whose cost can't be estimated, so the note can name them. */
export function rosteredWithoutRate<P extends Priced>(staff: P[], shifts: Timed[]): P[] {
  return staff.filter((p) => p.hourlyRate === null && hoursFor(p.id, shifts) > 0)
}

export const NO_RATE = 'No hourly rate. Add one on the Staff page.'

// 'Priya, Dana and Mike'
const and = (items: string[]) =>
  items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`

/** Who the total leaves out for having no rate: 'Jean has no hourly rate, so isn't in the total'. Null for no one. */
export function noRateNote(noRate: Pick<Priced, 'name'>[]): string | null {
  if (!noRate.length) return null
  const names = noRate.map((p) => firstName(p.name))
  const verb = names.length === 1 ? "has no hourly rate, so isn't" : "have no hourly rate, so aren't"
  return `${and(names)} ${verb} in the total`
}
