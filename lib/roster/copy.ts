// Copy previous week: what comes across from one week into another, and what
// doesn't. Shifts come across, and so do the week's closed days, which is how
// the usual Tuesday closure travels. N/A notes are that week's own.

import { isClosed } from './closed'
import { DAY_NAMES, addDays, weekRange, weekdayIndex, type IsoDate } from './dates'
import { shiftsLabel, type NewShift } from './shifts'

/** How many shifts were left behind, by reason. */
export type Skipped = { inactive: number; closed: number }

const NONE_SKIPPED: Skipped = { inactive: 0, closed: 0 }

/** What to put in the week copied into: its shifts and closed days, and what was left behind. */
export type CopyPlan = { shifts: NewShift[]; closedDays: boolean[]; skipped: Skipped }

/**
 * The week copied into takes on the closed days of the week copied from.
 * Each shift lands on the same weekday, for the same person, unless they're
 * no longer active or that day is closed. Skipped shifts are counted rather
 * than dropped, so the report can name them.
 */
export function planCopy({
  from,
  closedDays,
  to,
  staff,
}: {
  /** The shifts of the week being copied */
  from: NewShift[]
  /** The closed days of the week being copied, which come across with it */
  closedDays: boolean[]
  /** The Monday of the week they go into */
  to: IsoDate
  staff: { id: number; active: boolean }[]
}): CopyPlan {
  const active = new Set(staff.filter((p) => p.active).map((p) => p.id))
  const plan: CopyPlan = { shifts: [], closedDays: [...closedDays], skipped: { ...NONE_SKIPPED } }
  for (const s of from) {
    const date = addDays(to, weekdayIndex(s.date))
    if (!active.has(s.staffId)) plan.skipped.inactive++
    else if (isClosed(plan.closedDays, date)) plan.skipped.closed++
    else plan.shifts.push({ staffId: s.staffId, date, start: s.start, end: s.end })
  }
  return plan
}

/** 'Skipped 1 for staff no longer active, 2 on a day this week is closed.', or '' when nothing was. */
function skipsText(skipped: Skipped): string {
  const skips = [
    skipped.inactive > 0 && `${skipped.inactive} for staff no longer active`,
    skipped.closed > 0 && `${skipped.closed} on a day this week is closed`,
  ].filter(Boolean)
  return skips.length ? `Skipped ${skips.join(', ')}.` : ''
}

/**
 * Why a copy changes nothing: the week has no shifts, or none of them can
 * come across. Either way this week keeps what it has.
 */
export function nothingToCopy(from: IsoDate, skipped: Skipped = NONE_SKIPPED): string {
  const skips = skipsText(skipped)
  if (!skips) return `${weekRange(from)} has no shifts on it.`
  return `Nothing on ${weekRange(from)} can come across, so this week is unchanged. ${skips}`
}

/** 'Tue closed and Wed reopened, to match that week.', or '' when no day changed. */
function closedText(before: boolean[], after: boolean[]): string {
  const changed = (closed: boolean) => DAY_NAMES.filter((_, i) => !!before[i] !== closed && !!after[i] === closed)
  const [closed, reopened] = [changed(true), changed(false)]
  const changes = [
    closed.length > 0 && `${closed.join(', ')} closed`,
    reopened.length > 0 && `${reopened.join(', ')} reopened`,
  ]
    .filter(Boolean)
    .join(' and ')
  return changes && `${changes}, to match that week.`
}

/**
 * '12 shifts copied from 28 Sep – 4 Oct. Tue closed, to match that week.
 * Skipped 1 for staff no longer active.' Any day the copy closed or reopened
 * is named, so a closure set on this week can't vanish unnoticed.
 */
export function copyReport(plan: CopyPlan, from: IsoDate, closedBefore: boolean[]): string {
  return [
    `${shiftsLabel(plan.shifts.length)} copied from ${weekRange(from)}.`,
    closedText(closedBefore, plan.closedDays),
    skipsText(plan.skipped),
  ]
    .filter(Boolean)
    .join(' ')
}
