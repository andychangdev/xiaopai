// Copy previous week: what comes across from one week into another, and what
// doesn't. Only shifts ever come across; N/A notes are that week's own.

import { addDays, weekRange, weekdayIndex, type IsoDate } from './dates'
import type { NewShift } from './shifts'

/** How many shifts were left behind, by reason. */
export type Skipped = { inactive: number }

/** The shifts to put in the week copied into, and what was left behind. */
export type CopyPlan = { shifts: NewShift[]; skipped: Skipped }

/**
 * Each shift of the week copied from lands on the same weekday of the week
 * copied into, for the same person, unless they're no longer active. Skipped
 * shifts are counted rather than dropped, so the report can name them.
 */
export function planCopy({
  from,
  to,
  staff,
}: {
  /** The shifts of the week being copied */
  from: NewShift[]
  /** The Monday of the week they go into */
  to: IsoDate
  staff: { id: number; active: boolean }[]
}): CopyPlan {
  const active = new Set(staff.filter((p) => p.active).map((p) => p.id))
  const plan: CopyPlan = { shifts: [], skipped: { inactive: 0 } }
  for (const s of from) {
    if (!active.has(s.staffId)) plan.skipped.inactive++
    else plan.shifts.push({ staffId: s.staffId, date: addDays(to, weekdayIndex(s.date)), start: s.start, end: s.end })
  }
  return plan
}

/** 'Skipped 1 for staff no longer active.', or '' when nothing was. */
function skipsText(skipped: Skipped): string {
  const skips = [skipped.inactive > 0 && `${skipped.inactive} for staff no longer active`].filter(Boolean)
  return skips.length ? `Skipped ${skips.join(', ')}.` : ''
}

/**
 * Why a copy changes nothing: the week has no shifts, or none of them can
 * come across. Either way this week keeps what it has.
 */
export function nothingToCopy(from: IsoDate, skipped: Skipped = { inactive: 0 }): string {
  const skips = skipsText(skipped)
  if (!skips) return `${weekRange(from)} has no shifts on it.`
  return `Nothing on ${weekRange(from)} can come across, so this week is unchanged. ${skips}`
}

/** '12 shifts copied from 28 Sep – 4 Oct. Skipped 1 for staff no longer active.' */
export function copyReport(plan: CopyPlan, from: IsoDate): string {
  const n = plan.shifts.length
  return [`${n} shift${n === 1 ? '' : 's'} copied from ${weekRange(from)}.`, skipsText(plan.skipped)]
    .filter(Boolean)
    .join(' ')
}
