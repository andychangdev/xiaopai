// The roster as it reaches staff: plain text, sized for a phone, pasted into
// the group chat. Each day lists only who's on, so the chat isn't cluttered
// with absences. The text comes from the same day-by-day shape a published
// snapshot freezes (ARCHITECTURE §6).

import { isClosed } from './closed'
import { addDays, dayLabel, shortDate, weekDates, type IsoDate } from './dates'
import { cellKey, shiftsByCell, type Shift } from './shifts'
import { firstName } from './staff'
import { formatTime } from './time'
import type { Snapshot } from './types'

// One restaurant, no second site, ever (SPEC §1)
const BUSINESS = 'Ah Ma'

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
          return times.length ? [{ name: person.name, times }] : []
        })
    return { date, closed, on }
  })
}

/** '5 Oct - 11 Oct 2026', or '28 Dec 2026 - 3 Jan 2027' across New Year. */
function rangeLine(weekStart: IsoDate): string {
  const sunday = addDays(weekStart, 6)
  const [from, to] = [weekStart.slice(0, 4), sunday.slice(0, 4)]
  return from === to
    ? `${shortDate(weekStart)} - ${shortDate(sunday)} ${to}`
    : `${shortDate(weekStart)} ${from} - ${shortDate(sunday)} ${to}`
}

/**
 * The text to paste: a heading, then each day, first names only, a split
 * shift on one line. A closed day says so, and an open one with nobody on it
 * says that, so it can't be taken for a line missed out. Until the week is
 * published it ends by saying it's a draft.
 */
export function rosterText({ weekStart, days }: Pick<Snapshot, 'weekStart' | 'days'>): string {
  const lines = [`${BUSINESS.toUpperCase()} — STAFF ROSTER`, rangeLine(weekStart), '']
  for (const day of days) {
    if (day.closed) {
      lines.push(`${dayLabel(day.date)} - CLOSED`, '')
      continue
    }
    const on = day.on.map((p) => `${firstName(p.name)} ${p.times.join(', ')}`)
    lines.push(dayLabel(day.date), ...(on.length ? on : ['(no one rostered)']), '')
  }
  lines.push('DRAFT - not published yet')
  return lines.join('\n')
}
