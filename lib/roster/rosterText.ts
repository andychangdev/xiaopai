// The roster as it reaches staff: plain text, sized for a phone, pasted into
// the group chat. Each day lists only who's on, so the chat isn't cluttered
// with absences. The text comes from the same day-by-day shape a published
// snapshot freezes (ARCHITECTURE §6).

import { isClosed } from './closed'
import { addDays, dayLabel, fullDate, shortDate, weekDates, type IsoDate } from './dates'
import { cellKey, shiftsByCell, type Shift } from './shifts'
import { firstName } from './staff'
import { formatTime, type Minutes } from './time'
import type { Snapshot } from './types'

/**
 * Each day of the week, Monday first: whether it's closed, and who's on, in
 * roster row order, with their times as they'll read in the chat.
 */
export function rosterDays({
  weekStart,
  staff,
  shifts,
  closedDays,
}: {
  weekStart: IsoDate
  /**
   * The week's rows, in order. Anyone with a shift must be among them, as
   * rosterRows sees to, or their shifts are left out of the text.
   */
  staff: { id: number; name: string }[]
  shifts: Shift[]
  closedDays: boolean[]
}): Snapshot['days'] {
  const cells = shiftsByCell(shifts)
  return weekDates(weekStart).map((date) => {
    const closed = isClosed(closedDays, date)
    const on = closed
      ? []
      : staff.flatMap((person) => {
          const theirs = cells.get(cellKey(person.id, date)) ?? []
          // Plain hyphens: the chat is no place for typography
          const times = theirs.map((s) => `${formatTime(s.start)}-${formatTime(s.end)}`)
          return times.length ? [{ staffId: person.id, name: person.name, times }] : []
        })
    return { date, closed, on }
  })
}

/** '10:00-18:00', as rosterDays writes a snapshot's times, back to minutes. */
export function timesOf(range: string): { start: Minutes; end: Minutes } {
  const [start, end] = range.split('-').map((time) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  })
  return { start, end }
}

/** '5 Oct - 11 Oct 2026', or '28 Dec 2026 - 3 Jan 2027' across New Year. */
function rangeLine(weekStart: IsoDate): string {
  const sunday = addDays(weekStart, 6)
  const [from, to] = [weekStart.slice(0, 4), sunday.slice(0, 4)]
  return from === to
    ? `${shortDate(weekStart)} - ${shortDate(sunday)} ${to}`
    : `${shortDate(weekStart)} ${from} - ${shortDate(sunday)} ${to}`
}

/** 'Published 27 Sep 2026', then 'Updated 8 Oct 2026 (v2)', so a fresh copy can be told from the last. */
function publishedLine(publishedAt: IsoDate, version: number): string {
  return version > 1 ? `Updated ${fullDate(publishedAt)} (v${version})` : `Published ${fullDate(publishedAt)}`
}

/**
 * The text to paste: a heading with the business's name, then each day, first names only, a split
 * shift on one line. A closed day says so, and an open one with nobody on it
 * says that, so it can't be taken for a line missed out. It ends by saying
 * when it was published, or that it's a draft, so a half-built week can't be
 * pasted by accident.
 */
export function rosterText({
  businessName,
  weekStart,
  days,
  publishedAt,
  version,
}: { businessName: string } & Pick<Snapshot, 'weekStart' | 'days'> &
  Partial<Pick<Snapshot, 'publishedAt' | 'version'>>): string {
  const lines = [`${businessName.toUpperCase()} — STAFF ROSTER`, rangeLine(weekStart), '']
  for (const day of days) {
    if (day.closed) {
      lines.push(`${dayLabel(day.date)} - CLOSED`, '')
      continue
    }
    const on = day.on.map((p) => `${firstName(p.name)} ${p.times.join(', ')}`)
    lines.push(dayLabel(day.date), ...(on.length ? on : ['(no one rostered)']), '')
  }
  lines.push(publishedAt && version ? publishedLine(publishedAt, version) : 'DRAFT - not published yet')
  return lines.join('\n')
}
