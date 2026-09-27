// The whole warnings list for a week: everything unusual about it, naming the
// person each time. Warnings only ever advise. Nothing here stops a shift
// being saved or the week being published.

import { addDays, dayName, weekDates, type IsoDate } from './dates'
import { againstExpected, hoursFor, percentOff } from './hours'
import { leaveOn, type Leave } from './leave'
import { naReason, type NaNote, type NaReason } from './notAvailable'
import { shiftsByCell, type Shift } from './shifts'
import { DAY_END, formatHours, type Minutes } from './time'

/** 'high' is something that shouldn't happen; 'low' is worth a second look. */
export type Warning = { level: 'high' | 'low'; who: string; text: string }

type Person = { id: number; name: string; expectedHours: number | null; available: boolean[] }

const MAX_WEEK: Minutes = 38 * 60
const MIN_REST: Minutes = 10 * 60

const rank = { high: 0, low: 1 }

// Why the person shouldn't be on this day, the strongest reason first
const dayWarning: Record<'leave' | NaReason, (date: IsoDate) => string> = {
  leave: (date) => `Rostered on ${dayName(date)}, which is booked as leave.`,
  marked: (date) => `Rostered on ${dayName(date)}, marked not available this week.`,
  usual: (date) => `Rostered on ${dayName(date)} — not usually available.`,
}

const overlap = (a: Shift, b: Shift) => a.start < b.end && b.start < a.end

/**
 * The shifts that overlap another of the same person's on the same day. The
 * grid outlines them, since the panel can't point at which two.
 */
export function overlappingShifts(shifts: Shift[]): Set<number> {
  const flagged = new Set<number>()
  for (const cell of shiftsByCell(shifts).values()) {
    for (const [i, a] of cell.entries()) {
      for (const b of cell.slice(i + 1)) if (overlap(a, b)) flagged.add(a.id).add(b.id)
    }
  }
  return flagged
}

/** Every warning for the week, the serious ones first, then each in row order. */
export function buildWarnings({
  staff,
  shifts,
  naNotes,
  leave,
  weekStart,
}: {
  staff: Person[]
  shifts: Shift[]
  naNotes: NaNote[]
  /** Leave booked during the week */
  leave: Pick<Leave, 'staffId' | 'fromDate' | 'toDate'>[]
  weekStart: IsoDate
}): Warning[] {
  const overlapping = overlappingShifts(shifts)
  const warnings = staff.flatMap((person) => {
    const theirs = shifts.filter((s) => s.staffId === person.id)
    const out: Warning[] = []
    const warn = (level: Warning['level'], text: string) => out.push({ level, who: person.name, text })

    if (theirs.some((s) => overlapping.has(s.id))) warn('high', 'Two shifts overlap on the same day.')

    const hours = hoursFor(person.id, shifts)
    if (hours > MAX_WEEK) warn('high', `${formatHours(hours)} rostered — over the ${formatHours(MAX_WEEK)} week.`)

    for (const date of weekDates(weekStart).slice(0, -1)) {
      const next = addDays(date, 1)
      const today = theirs.filter((s) => s.date === date)
      const tomorrow = theirs.filter((s) => s.date === next)
      if (!today.length || !tomorrow.length) continue
      const rest = DAY_END - Math.max(...today.map((s) => s.end)) + Math.min(...tomorrow.map((s) => s.start))
      if (rest < MIN_REST) {
        warn('low', `Only ${formatHours(rest)} between ${dayName(date)} close and ${dayName(next)} start.`)
      }
    }

    // On leave (only when it was booked over them), marked this week or outside
    // their pattern: one warning a day, naming the strongest
    for (const date of weekDates(weekStart)) {
      if (!theirs.some((s) => s.date === date)) continue
      const why = leaveOn(leave, person.id, date) ? 'leave' : naReason(person, date, naNotes)
      if (why) warn('high', dayWarning[why](date))
    }

    const { expectedHours } = person
    const mark = againstExpected(hours, expectedHours)
    if (mark && expectedHours !== null) {
      warn('low', `${formatHours(hours)} vs ${expectedHours}h expected — ${percentOff(hours, expectedHours)}% ${mark}.`)
    }
    return out
  })
  // Stable, so row order holds within each level
  return warnings.sort((a, b) => rank[a.level] - rank[b.level])
}
