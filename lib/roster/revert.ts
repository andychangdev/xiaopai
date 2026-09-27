// Revert: putting a published week back as it went out, once it's been edited
// since. Its shifts and closed days go back to the snapshot's. N/A notes were
// never published, so they stay as they are. A published shift the week can
// no longer take stays out: one for someone removed from the staff list
// since, or on leave that day, since booking leave over a shift is the
// manager's call. The week then still differs from what staff have, and reads
// Unpublished changes, which is true.

import { fullDate, type IsoDate } from './dates'
import { leaveOn, type Leave } from './leave'
import { shiftsLabel, type NewShift, type Shift } from './shifts'
import type { Minutes } from './time'
import type { Snapshot } from './types'

/** How many published shifts can't come back, by why. */
export type RevertSkipped = { gone: number; onLeave: number }

/** What reverting does to the week, and what of the published version it can't put back. */
export type RevertPlan = {
  closedDays: boolean[]
  /** Ids of the shifts there now that the published version doesn't have */
  remove: number[]
  /** Shifts the published version has that aren't there now */
  add: NewShift[]
  skipped: RevertSkipped
  /** Whether it changes the week at all */
  changes: boolean
}

/** '10:00-18:00', as rosterDays writes a snapshot's times, back to minutes. */
function timesOf(range: string): { start: Minutes; end: Minutes } {
  const [start, end] = range.split('-').map((time) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  })
  return { start, end }
}

const shiftKey = (s: NewShift) => `${s.staffId}|${s.date}|${s.start}|${s.end}`

/**
 * The week's shifts go back to the published version's: those there now with
 * the same person, day and times stay as they are, ids and all, the rest go,
 * and whatever's missing comes back, unless the person's no longer on the
 * staff list or is on leave that day. Inactive staff still have a record,
 * and were on the version staff have, so theirs come back.
 */
export function planRevert({
  snapshot,
  shifts,
  closedDays,
  staffIds,
  leave,
}: {
  snapshot: Snapshot
  /** The week's shifts now */
  shifts: Shift[]
  /** Its closed days now */
  closedDays: boolean[]
  /** Everyone on the staff list, active or not */
  staffIds: Set<number>
  /** Leave booked during the week */
  leave: Pick<Leave, 'staffId' | 'fromDate' | 'toDate'>[]
}): RevertPlan {
  // The shifts there now, by who, when and times, for the published ones to claim
  const unclaimed = new Map<string, number[]>()
  for (const s of shifts) unclaimed.set(shiftKey(s), [...(unclaimed.get(shiftKey(s)) ?? []), s.id])

  const add: NewShift[] = []
  const skipped: RevertSkipped = { gone: 0, onLeave: 0 }
  for (const { date, on } of snapshot.days) {
    for (const { staffId, times } of on) {
      for (const range of times) {
        const s = { staffId, date, ...timesOf(range) }
        const there = unclaimed.get(shiftKey(s))
        if (there?.length) there.shift()
        else if (!staffIds.has(staffId)) skipped.gone++
        else if (leaveOn(leave, staffId, date)) skipped.onLeave++
        else add.push(s)
      }
    }
  }

  const remove = [...unclaimed.values()].flat().sort((a, b) => a - b)
  const closed = snapshot.days.map((day) => day.closed)
  const reopensOrCloses = closed.some((c, i) => c !== !!closedDays[i])
  return { closedDays: closed, remove, add, skipped, changes: add.length > 0 || remove.length > 0 || reopensOrCloses }
}

/** '1 shift for someone no longer on the staff list and 2 shifts now on booked leave', or '' when none. */
function skipsText({ gone, onLeave }: RevertSkipped): string {
  return [
    gone > 0 && `${shiftsLabel(gone)} for someone no longer on the staff list`,
    onLeave > 0 && `${shiftsLabel(onLeave)} now on booked leave`,
  ]
    .filter(Boolean)
    .join(' and ')
}

/** The confirm dialog, naming the version the week goes back to. */
export function revertQuestion(state: { version: number; publishedAt: IsoDate }): {
  title: string
  body: string
  ok: string
} {
  const v = `v${state.version}`
  return {
    title: `Revert to ${v}?`,
    body: `Puts the week's shifts and closed days back as they were published on ${fullDate(state.publishedAt)}. The changes made since are discarded, though Undo can bring them back.`,
    ok: `Revert to ${v}`,
  }
}

/** What to say after a revert that couldn't put everything back, or '' when it did. */
export function revertReport(plan: RevertPlan, version: number): string {
  const skips = skipsText(plan.skipped)
  return (
    skips &&
    `The week is back to v${version}, less ${skips}, which can't come back. It still differs from what staff have, so Publish update to tell them.`
  )
}

/** Why a revert would change nothing: all that differs from the published version can't go back. */
export function nothingToRevert(plan: RevertPlan, version: number): string {
  const skips = skipsText(plan.skipped)
  if (!skips) return `The week is already as v${version} went out.`
  return `Nothing more can go back to v${version}: ${skips} can't come back. Publish update to tell staff.`
}
