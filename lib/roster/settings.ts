// Rules for the Settings page: the business's name, the trading hours for
// each weekday, the line under the grid that sums them up, where a new shift
// template starts, and the day the templates are drawn against. Trading hours
// only ever show; nothing else depends on them.

import { DAY_NAMES } from './dates'
import { formatRange, formatTime, timesError, type Minutes } from './time'

/** What the app calls the business until Settings names it. */
export const DEFAULT_BUSINESS_NAME = 'Your restaurant'

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

/**
 * Which days Settings highlights, Monday first: any whose hours aren't the
 * usual ones, opening or closing. The usual hours are the ones more days
 * have than any other; with no hours ahead outright, no day stands out.
 */
export function unusualDays(week: TradingDay[]): boolean[] {
  const key = (d: TradingDay) => `${d.open}-${d.close}`
  const counts = new Map<string, number>()
  for (const d of week) counts.set(key(d), (counts.get(key(d)) ?? 0) + 1)
  const [first, second = 0] = [...counts.values()].sort((a, b) => b - a)
  if (first === second) return week.map(() => false)
  const usual = [...counts].find(([, n]) => n === first)![0]
  return week.map((d) => key(d) !== usual)
}

/** How long the shop is open across the week. */
export function openMinutes(week: TradingDay[]): Minutes {
  return week.reduce((sum, d) => sum + d.close - d.open, 0)
}

/**
 * The day Settings draws each shift template against: from the week's
 * earliest opening to its latest close, widened to fit any template that
 * runs outside them. Ticks mark both ends and the round hours between, kept
 * clear of the ends. Spans are the times not every day is open, to hatch,
 * each with a note on which days are.
 */
export type TemplateScale = {
  start: Minutes
  end: Minutes
  ticks: Minutes[]
  spans: { from: Minutes; to: Minutes; note: string }[]
}

export function templateScale(week: TradingDay[], templates: { start: Minutes; end: Minutes }[]): TemplateScale {
  const start = Math.min(...week.map((d) => d.open), ...templates.map((t) => t.start))
  const end = Math.max(...week.map((d) => d.close), ...templates.map((t) => t.end))

  const step = end - start > 12 * 60 ? 180 : 120
  const ticks = [start]
  for (let t = Math.ceil(start / step) * step; t < end; t += step) {
    if (t - start > 60 && end - t > 60) ticks.push(t)
  }
  ticks.push(end)

  // Between one opening or closing and the next, the same days are open throughout
  const edges = [...new Set([start, end, ...week.flatMap((d) => [d.open, d.close])])]
    .filter((t) => start <= t && t <= end)
    .sort((a, b) => a - b)
  const spans: { from: Minutes; to: Minutes; who: string }[] = []
  edges.slice(0, -1).forEach((from, i) => {
    const to = edges[i + 1]
    const mid = (from + to) / 2
    const open = DAY_NAMES.filter((_, weekday) => week[weekday].open <= mid && mid < week[weekday].close)
    if (open.length === DAY_NAMES.length) return
    const who = !open.length
      ? 'closed every day'
      : open.length >= 4
        ? `every day but ${DAY_NAMES.filter((day) => !open.includes(day)).join(', ')}`
        : `${open.join(', ')} only`
    const last = spans.at(-1)
    if (last && last.to === from && last.who === who) last.to = to
    else spans.push({ from, to, who })
  })

  const when = (from: Minutes, to: Minutes) =>
    from === start && to !== end ? `Before ${formatTime(to)}` : to === end && from !== start ? `After ${formatTime(from)}` : formatRange(from, to)
  return { start, end, ticks, spans: spans.map(({ from, to, who }) => ({ from, to, note: `${when(from, to)}: ${who}` })) }
}

/** Where a stretch of the day sits on the scale, as percentages of its width. */
export function placeOnScale(scale: TemplateScale, from: Minutes, to: Minutes): { left: number; width: number } {
  const length = scale.end - scale.start
  return { left: ((from - scale.start) / length) * 100, width: ((to - from) / length) * 100 }
}

export const CLOSE_AFTER_OPEN = 'The shop has to close after it opens, and by midnight.'

/** Why a day can't have these hours, or null when it can. */
export function tradingHoursError(open: Minutes, close: Minutes): string | null {
  return timesError(open, close) && CLOSE_AFTER_OPEN
}

/** What Add template puts at the end of the list, to be renamed and retimed. */
export const NEW_TEMPLATE = { name: 'New template', start: 600, end: 960 }
