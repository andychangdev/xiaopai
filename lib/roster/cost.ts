// Money for the cost estimate: each person's hourly rate, and the weekend and
// public holiday rates that raise it, as percentages. A rate is whole cents
// (2850 = $28.50), so adding them up never meets floating point.

import { dayName, fullDate, parseIsoDate, type IsoDate } from './dates'

export type Cents = number

/** Of someone's hourly rate: 125 is time and a quarter. */
export type Percent = number

export type Holiday = { date: IsoDate; name: string | null }

/** The weekend and public holiday rates, each a percentage of someone's hourly rate, and the public holidays. */
export type PayRates = { weekend: Percent; holiday: Percent; holidays: Holiday[] }

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
