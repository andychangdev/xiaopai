// Leave: a booked absence, one day or three weeks, belonging to the person and
// to real dates rather than to any week. It's the one thing that blocks: a day
// inside it takes no shift. Days are compared as 'YYYY-MM-DD' strings, which
// sort the same way the calendar does.

import { dayLabel, daysBetween, parseIsoDate, shortDate, type IsoDate } from './dates'
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

/**
 * The chip on someone's line on the Staff page: their next leave, counting
 * any they're on now, and how many more bookings follow it. 'Away 11–13 Oct
 * +1', 'Away until 6 Oct'. Null with nothing to come.
 */
export function awayLabel(leave: Span[], today: IsoDate): string | null {
  const ahead = leave.filter((l) => !isPast(l, today)).sort((a, b) => a.fromDate.localeCompare(b.fromDate))
  const next = ahead[0]
  if (!next) return null
  const more = ahead.length > 1 ? ` +${ahead.length - 1}` : ''
  return `Away ${awayWhen(next, today)}${more}`
}

function awayWhen({ fromDate, toDate }: Span, today: IsoDate): string {
  if (fromDate <= today) return toDate === today ? 'today' : `until ${shortDate(toDate)}`
  if (fromDate === toDate) return shortDate(fromDate)
  const [from, to] = [shortDate(fromDate), shortDate(toDate)]
  // Within a month the month goes once: '11–13 Oct'
  if (fromDate.slice(0, 7) === toDate.slice(0, 7)) return `${from.split(' ')[0]}–${to}`
  return `${from} – ${to}`
}
