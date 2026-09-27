// Publishing: freezing a week as the version staff work from (ARCHITECTURE
// §6). A published week stays editable. Whether it's been edited since is
// never stored: it's the live week checked against its snapshot, by who and
// when, so renaming someone or reordering the rows never counts.

import { addDays, dayLabel, fullDate, weekRange, type IsoDate } from './dates'
import { shiftsLabel } from './shifts'
import { formatHours, type Minutes } from './time'
import type { Snapshot } from './types'

/** Never published; or published, at some version, and maybe edited since. */
export type PublishState =
  | { status: 'draft' }
  | { status: 'published'; version: number; publishedAt: IsoDate; changed: boolean }

/** The week as it stands, frozen as the next version: v1 the first time, then one more each time. */
export function snapshotOf({
  weekStart,
  days,
  today,
  previous,
}: {
  weekStart: IsoDate
  days: Snapshot['days']
  today: IsoDate
  /** The version published before, if there was one */
  previous: { version: number } | null
}): Snapshot {
  return { weekStart, publishedAt: today, version: (previous?.version ?? 0) + 1, days }
}

/** A day as who's on and when, whatever their names are now and whatever order the rows are in. */
function dayKey(day: Snapshot['days'][number]): string {
  const on = day.on.map((p) => `${p.staffId}:${p.times.join(',')}`).sort()
  return `${day.closed}|${on.join(';')}`
}

/** Whether the week has changed since it was published: a shift or a closed day, never a name. */
export function changedSince(snapshot: Snapshot, days: Snapshot['days']): boolean {
  return snapshot.days.length !== days.length || snapshot.days.some((day, i) => dayKey(day) !== dayKey(days[i]))
}

/** Where the week stands, from its roster (if it has one) and how it looks now. */
export function publishState(
  roster:
    | { status: 'draft' | 'published'; version: number; publishedAt: IsoDate | null; snapshot: Snapshot | null }
    | undefined,
  days: Snapshot['days'],
): PublishState {
  if (roster?.status !== 'published' || !roster.snapshot || !roster.publishedAt) return { status: 'draft' }
  const { version, publishedAt, snapshot } = roster
  return { status: 'published', version, publishedAt, changed: changedSince(snapshot, days) }
}

/** The badge beside the Publish button. */
export function publishBadge(state: PublishState): string {
  if (state.status === 'draft') return 'Draft'
  return state.changed ? 'Unpublished changes' : `Published · v${state.version}`
}

/** 'Week of Mon 5 Oct · Published 26 Sep 2026 · v2 · edited since', under the week's title. */
export function weekSubtitle(weekStart: IsoDate, state: PublishState): string {
  const week = `Week of ${dayLabel(weekStart)}`
  if (state.status === 'draft') return `${week} · Draft`
  return [
    week,
    `Published ${fullDate(state.publishedAt)}`,
    state.version > 1 && `v${state.version}`,
    state.changed && 'edited since',
  ]
    .filter(Boolean)
    .join(' · ')
}

export const NOTHING_TO_PUBLISH = 'This week has no shifts on it yet.'

/**
 * A week never published with no shifts has nothing to say. One published
 * and emptied since does: staff need telling the week they have is gone.
 */
export function nothingToPublish(state: PublishState, shifts: number): boolean {
  return state.status === 'draft' && shifts === 0
}

/**
 * The confirm dialog: what's going out, the version an update becomes, and
 * any warnings outstanding. Warnings never stop it: the manager already knows
 * the week is unusual.
 */
export function publishQuestion({
  weekStart,
  state,
  shifts,
  minutes,
  warnings,
  today,
}: {
  weekStart: IsoDate
  state: PublishState
  shifts: number
  minutes: Minutes
  warnings: number
  today: IsoDate
}): { title: string; body: string; ok: string } {
  const what = shifts
    ? `${shiftsLabel(shifts)}, ${formatHours(minutes)} across ${weekRange(weekStart)}.`
    : `No shifts across ${weekRange(weekStart)}.`
  const warned =
    warnings > 0
      ? ` ${warnings} warning${warnings === 1 ? ' is' : 's are'} outstanding — publishing goes ahead anyway.`
      : ''
  if (state.status === 'draft') {
    return {
      title: 'Publish this week?',
      body: `${what} The roster text becomes the version staff work from.${warned}`,
      ok: 'Publish',
    }
  }
  const next = state.version + 1
  return {
    title: 'Publish an update?',
    body: `${what} This becomes version ${next}, and the roster text will end “Updated ${fullDate(today)} (v${next})”, so nobody works from the copy already in the chat.${warned}`,
    ok: `Publish v${next}`,
  }
}

/**
 * The week the app opens on: the earliest one that still needs work. That's
 * this week until it's published, then next week until that is, then back to
 * this week to see what's live. Never further ahead, which would drop you into
 * some half-built week months away.
 */
export function landingWeek(thisWeek: IsoDate, isPublished: (week: IsoDate) => boolean): IsoDate {
  const nextWeek = addDays(thisWeek, 7)
  if (!isPublished(thisWeek)) return thisWeek
  if (!isPublished(nextWeek)) return nextWeek
  return thisWeek
}
