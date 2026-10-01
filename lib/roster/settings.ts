// Rules for the Settings page: the business's name, the trading hours for
// each weekday, the line under the grid that sums them up, and where a new
// shift template starts. Trading hours only ever show; nothing else depends on
// them.

import { DAY_NAMES } from './dates'
import { formatRange, formatTime, timesError, type Minutes } from './time'

/** What the app calls the business until Settings names it. */
export const DEFAULT_BUSINESS_NAME = 'Your restaurant'

/**
 * The one character on the sidebar's square: the name's first letter or
 * digit, capitalised. A name with neither, like a lone emoji, shows its
 * first character instead.
 */
export function businessInitial(name: string): string {
  const first = name.match(/[\p{L}\p{N}]/u)?.[0] ?? [...name.trim()][0] ?? ''
  return first.toLocaleUpperCase()
}

export type TradingDay = { open: Minutes; close: Minutes }

const THURSDAY = 3

/** Monday first: 10:00–18:00, and to 21:00 on Thursday for shopping night. */
export const DEFAULT_TRADING_HOURS: TradingDay[] = DAY_NAMES.map((_, weekday) => ({
  open: 600,
  close: weekday === THURSDAY ? 1260 : 1080,
}))

/** All seven days, Monday first. A day with nothing stored has its default hours. */
export function tradingWeek(rows: ({ weekday: number } & TradingDay)[]): TradingDay[] {
  return DEFAULT_TRADING_HOURS.map((usual, weekday) => {
    const row = rows.find((r) => r.weekday === weekday)
    return row ? { open: row.open, close: row.close } : { ...usual }
  })
}

/**
 * The week in one line: 'Open 10:00–18:00 · 21:00 Thu'. It leads with the most
 * common hours, then gives each other day's. A day that only stays open later
 * gets just its closing time, which can't be mistaken for opening; any other
 * gets its whole range. Days with the same hours share one entry.
 */
export function tradingSummary(week: TradingDay[]): string {
  const key = (d: TradingDay) => `${d.open}-${d.close}`
  const daysWith = new Map<string, number[]>()
  week.forEach((d, weekday) => daysWith.set(key(d), [...(daysWith.get(key(d)) ?? []), weekday]))

  // In weekday order of each one's first day, so a tie keeps the earlier
  const groups = [...daysWith.values()]
  const usualDays = groups.reduce((most, days) => (days.length > most.length ? days : most))
  const usual = week[usualDays[0]]
  const odd = groups
    .filter((days) => days !== usualDays)
    .map((days) => {
      const { open, close } = week[days[0]]
      const times = open === usual.open && close > usual.close ? formatTime(close) : formatRange(open, close)
      return `${times} ${days.map((i) => DAY_NAMES[i]).join(', ')}`
    })
  return [`Open ${formatRange(usual.open, usual.close)}`, ...odd].join(' · ')
}

export const CLOSE_AFTER_OPEN = 'The shop has to close after it opens, and by midnight.'

/** Why a day can't have these hours, or null when it can. */
export function tradingHoursError(open: Minutes, close: Minutes): string | null {
  return timesError(open, close) && CLOSE_AFTER_OPEN
}

/** What Add template puts at the end of the list, to be renamed and retimed. */
export const NEW_TEMPLATE = { name: 'New template', start: 600, end: 960 }
