// Leave: a booked absence, one day or three weeks, belonging to the person and
// to real dates rather than to any week. It's the one thing that blocks: a day
// inside it takes no shift. Days are compared as 'YYYY-MM-DD' strings, which
// sort the same way the calendar does.

import { addDays, dayLabel, daysBetween, mondayOf, parseIsoDate, shortDate, type IsoDate } from './dates'
import { firstName } from './staff'

export type Leave = { id: number; staffId: number; fromDate: IsoDate; toDate: IsoDate; note: string | null }

/** The days a booking covers, first and last included. */
type Span = { fromDate: IsoDate; toDate: IsoDate }

const covers = (l: Span, date: IsoDate) => l.fromDate <= date && date <= l.toDate

/** The booking that has this person away on this day, if one does. */
export function leaveOn<T extends Span & { staffId: number }>(
  leave: T[],
  staffId: number,
  date: IsoDate,
): T | undefined {
  return leave.find((l) => l.staffId === staffId && covers(l, date))
}

/** How many days it covers, both ends counted. */
export function leaveDays(l: Span): number {
  return daysBetween(l.fromDate, l.toDate) + 1
}

/** 'Thu 8 Oct – Fri 9 Oct', or 'Wed 7 Oct' for one day. */
export function leaveSpan(l: Span): string {
  return l.fromDate === l.toDate ? dayLabel(l.fromDate) : `${dayLabel(l.fromDate)} – ${dayLabel(l.toDate)}`
}

/** 'Thu 8 Oct – Fri 9 Oct · Family': the days, then the reason if there is one. */
export function describeLeave(l: Span & { note: string | null }): string {
  return l.note ? `${leaveSpan(l)} · ${l.note}` : leaveSpan(l)
}

/** 'On leave — Thu 8 Oct – Fri 9 Oct · Family', for the cell's popover. */
export function onLeaveSummary(l: Span & { note: string | null }): string {
  return `On leave — ${describeLeave(l)}`
}

/** 'Lisa — on leave Thu 8 Oct – Fri 9 Oct', for the cell. */
export function onLeaveNote(name: string, l: Span): string {
  return `${firstName(name)} — on leave ${leaveSpan(l)}`
}

/** Why a day inside someone's leave takes nothing. */
export function onLeaveError(name: string, l: Span): string {
  return `${firstName(name)} is on leave ${leaveSpan(l)}. Leave is booked on the Staff page.`
}

/**
 * A booking as typed on the Staff page. With no last day it's one day long.
 * A blank reason is none.
 */
export function parseLeave(input: {
  from: string
  to: string
  note: string
}): (Span & { note: string | null }) | { error: string } {
  const fromDate = parseIsoDate(input.from.trim())
  if (!fromDate) return { error: 'Pick the first day of the leave.' }
  const to = input.to.trim()
  const toDate = to ? parseIsoDate(to) : fromDate
  if (!toDate) return { error: 'The last day of the leave is not a date.' }
  if (toDate < fromDate) return { error: "Leave can't end before it starts." }
  return { fromDate, toDate, note: input.note.trim() || null }
}

/**
 * Why a new booking can't go in alongside the person's others, or null when
 * it can. Two bookings sharing a day would leave the grid unsure which one
 * to name.
 */
export function overlapError(name: string, booking: Span, theirs: Span[]): string | null {
  const clash = theirs.find((l) => l.fromDate <= booking.toDate && booking.fromDate <= l.toDate)
  if (!clash) return null
  return `${firstName(name)} already has leave booked ${leaveSpan(clash)}. Cancel that first to change it.`
}

/** Over, so the Staff page greys it. */
export function isPast(l: Span, today: IsoDate): boolean {
  return l.toDate < today
}

/** '5 Oct', '11–13 Oct', or '23 Oct – 9 Nov': within a month, the month goes once. */
export function shortSpan({ fromDate, toDate }: Span): string {
  if (fromDate === toDate) return shortDate(fromDate)
  const [from, to] = [shortDate(fromDate), shortDate(toDate)]
  if (fromDate.slice(0, 7) === toDate.slice(0, 7)) return `${from.split(' ')[0]}–${to}`
  return `${from} – ${to}`
}

/** How many weeks the Staff page's leave timeline shows, this one first. */
export const TIMELINE_WEEKS = 7

/**
 * The Staff page's leave timeline: seven weeks from this week's Monday, with
 * a row for each person with leave still to come or under way, in roster
 * order, and a bar per booking from its first day to its last, cut at the
 * edges where it runs past them. Days count from the timeline's first.
 * Alongside, the leave that's over, newest first, even if it was earlier this
 * week, and leave beyond the seven weeks, soonest first. So each booking is
 * in exactly one of the three.
 */
export function leaveTimeline<T extends Span & { staffId: number }>(leave: T[], order: number[], today: IsoDate) {
  const start = mondayOf(today)
  const days = TIMELINE_WEEKS * 7
  const end = addDays(start, days - 1)
  const bar = (l: T) => {
    const [first, last] = [l.fromDate < start ? start : l.fromDate, l.toDate > end ? end : l.toDate]
    return {
      leave: l,
      from: daysBetween(start, first),
      length: daysBetween(first, last) + 1,
      cutStart: first !== l.fromDate,
      cutEnd: last !== l.toDate,
    }
  }
  const soonest = (a: T, b: T) => a.fromDate.localeCompare(b.fromDate) || a.toDate.localeCompare(b.toDate)
  const inView = leave.filter((l) => l.fromDate <= end && !isPast(l, today)).sort(soonest)
  return {
    weeks: Array.from({ length: TIMELINE_WEEKS }, (_, i) => addDays(start, i * 7)),
    days,
    today: daysBetween(start, today),
    rows: order
      .map((staffId) => ({ staffId, bars: inView.filter((l) => l.staffId === staffId).map(bar) }))
      .filter((row) => row.bars.length),
    past: leave.filter((l) => isPast(l, today)).sort((a, b) => soonest(b, a)),
    later: leave.filter((l) => l.fromDate > end).sort(soonest),
  }
}
