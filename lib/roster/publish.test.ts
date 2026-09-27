import { describe, expect, it } from 'vitest'
import {
  NOTHING_TO_PUBLISH,
  changedSince,
  landingWeek,
  publishBadge,
  publishQuestion,
  publishState,
  snapshotOf,
  weekSubtitle,
} from './publish'
import { rosterDays } from './rosterText'

// 5 – 11 Oct 2026, with Tuesday closed
const WEEK = '2026-10-05'
const [MON, , WED] = ['05', '06', '07'].map((d) => `2026-10-${d}`)
const TUE_CLOSED = [false, true, false, false, false, false, false]

const JOHN = { id: 1, name: 'John Reyes' }
const LISA = { id: 4, name: 'Lisa Chen' }

let nextId = 1
const h = (hours: number) => hours * 60
const shift = (who: { id: number }, date: string, start: number, end: number) => ({
  id: nextId++,
  staffId: who.id,
  date,
  start: h(start),
  end: h(end),
})

const SHIFTS = [shift(JOHN, MON, 10, 18), shift(LISA, MON, 10, 16), shift(LISA, WED, 10, 14), shift(LISA, WED, 17, 21)]
const days = (staff = [JOHN, LISA], shifts = SHIFTS, closedDays = TUE_CLOSED) =>
  rosterDays({ weekStart: WEEK, staff, shifts, closedDays })

describe('snapshotOf', () => {
  const first = snapshotOf({ weekStart: WEEK, days: days(), today: '2026-09-27', previous: null })

  it('freezes the week as it is, as version 1, dated today', () => {
    expect(first).toEqual({ weekStart: WEEK, publishedAt: '2026-09-27', version: 1, days: days() })
  })

  it('keeps the names as they were', () => {
    expect(first.days[0].on.map((p) => p.name)).toEqual(['John Reyes', 'Lisa Chen'])
  })

  it('is the next version when the week has been published before', () => {
    const update = snapshotOf({ weekStart: WEEK, days: days(), today: '2026-10-08', previous: { version: 2 } })
    expect(update.version).toBe(3)
    expect(update.publishedAt).toBe('2026-10-08')
  })
})

describe('changedSince', () => {
  const published = snapshotOf({ weekStart: WEEK, days: days(), today: '2026-09-27', previous: null })

  it('is unchanged when nothing has moved', () => {
    expect(changedSince(published, days())).toBe(false)
  })

  it('is changed when a shift is added, removed or retimed', () => {
    expect(changedSince(published, days(undefined, [...SHIFTS, shift(JOHN, WED, 10, 18)]))).toBe(true)
    expect(changedSince(published, days(undefined, SHIFTS.slice(1)))).toBe(true)
    expect(changedSince(published, days(undefined, [shift(JOHN, MON, 10, 17), ...SHIFTS.slice(1)]))).toBe(true)
  })

  it('is changed when a shift moves to someone else', () => {
    expect(changedSince(published, days(undefined, [shift(LISA, MON, 10, 18), ...SHIFTS.slice(1)]))).toBe(true)
  })

  it('is changed when a day is closed or reopened', () => {
    expect(changedSince(published, days(undefined, undefined, [false, false, false, false, false, false, false]))).toBe(true)
    expect(changedSince(published, days(undefined, undefined, [false, true, false, false, false, false, true]))).toBe(true)
  })

  it('is unchanged when someone is renamed since', () => {
    expect(changedSince(published, days([{ ...JOHN, name: 'Jon Reyes' }, LISA]))).toBe(false)
  })

  it('is unchanged when the rows are put in another order since', () => {
    expect(changedSince(published, days([LISA, JOHN]))).toBe(false)
  })
})

describe('publishState', () => {
  const published = snapshotOf({ weekStart: WEEK, days: days(), today: '2026-09-26', previous: { version: 1 } })
  const roster = { status: 'published' as const, version: 2, publishedAt: '2026-09-26', snapshot: published }

  it('is a draft with no roster yet, or one never published', () => {
    expect(publishState(undefined, days())).toEqual({ status: 'draft' })
    expect(publishState({ status: 'draft', version: 0, publishedAt: null, snapshot: null }, days())).toEqual({
      status: 'draft',
    })
  })

  it('is published, with its version and date, and whether it has changed since', () => {
    expect(publishState(roster, days())).toEqual({
      status: 'published',
      version: 2,
      publishedAt: '2026-09-26',
      changed: false,
    })
    expect(publishState(roster, days(undefined, SHIFTS.slice(1)))).toMatchObject({ changed: true })
  })
})

describe('publishBadge', () => {
  it('names each of the three states', () => {
    expect(publishBadge({ status: 'draft' })).toBe('Draft')
    expect(publishBadge({ status: 'published', version: 1, publishedAt: '2026-09-26', changed: false })).toBe(
      'Published · v1',
    )
    expect(publishBadge({ status: 'published', version: 2, publishedAt: '2026-09-26', changed: true })).toBe(
      'Unpublished changes',
    )
  })
})

describe('weekSubtitle', () => {
  it('says draft until published', () => {
    expect(weekSubtitle(WEEK, { status: 'draft' })).toBe('Week of Mon 5 Oct · Draft')
  })

  it('says when it was published, with the version from v2, and whether it has been edited since', () => {
    const at = { status: 'published' as const, publishedAt: '2026-09-26' }
    expect(weekSubtitle(WEEK, { ...at, version: 1, changed: false })).toBe('Week of Mon 5 Oct · Published 26 Sep 2026')
    expect(weekSubtitle(WEEK, { ...at, version: 2, changed: true })).toBe(
      'Week of Mon 5 Oct · Published 26 Sep 2026 · v2 · edited since',
    )
  })
})

describe('publishQuestion', () => {
  const ask = { weekStart: WEEK, shifts: 12, minutes: h(96), today: '2026-10-08' }

  it('names the shifts and hours of a first publish', () => {
    expect(publishQuestion({ ...ask, state: { status: 'draft' }, warnings: 0 })).toEqual({
      title: 'Publish this week?',
      body: '12 shifts, 96h across 5 Oct – 11 Oct. The roster text becomes the version staff work from.',
      ok: 'Publish',
    })
  })

  it('names the new version of an update, and how the text will end', () => {
    const state = { status: 'published' as const, version: 1, publishedAt: '2026-09-26', changed: true }
    expect(publishQuestion({ ...ask, state, warnings: 0 })).toEqual({
      title: 'Publish an update?',
      body: '12 shifts, 96h across 5 Oct – 11 Oct. This becomes version 2, and the roster text will end “Updated 8 Oct 2026 (v2)”, so nobody works from the copy already in the chat.',
      ok: 'Publish v2',
    })
  })

  it("says how many warnings are outstanding, and that they don't stop it", () => {
    const body = (warnings: number) => publishQuestion({ ...ask, state: { status: 'draft' }, warnings }).body
    expect(body(3)).toMatch(/ 3 warnings are outstanding — publishing goes ahead anyway\.$/)
    expect(body(1)).toMatch(/ 1 warning is outstanding — publishing goes ahead anyway\.$/)
  })

  it('says shift, not shifts, for one', () => {
    expect(publishQuestion({ ...ask, shifts: 1, minutes: h(8), state: { status: 'draft' }, warnings: 0 }).body).toMatch(
      /^1 shift, 8h across/,
    )
  })
})

describe('NOTHING_TO_PUBLISH', () => {
  it('says why an empty week has nothing to publish', () => {
    expect(NOTHING_TO_PUBLISH).toBe('This week has no shifts on it yet.')
  })
})

describe('landingWeek', () => {
  const THIS = '2026-09-28'
  const NEXT = '2026-10-05'
  const published = (...weeks: string[]) => (week: string) => weeks.includes(week)

  it("is this week while it's unpublished", () => {
    expect(landingWeek(THIS, published())).toBe(THIS)
    expect(landingWeek(THIS, published(NEXT))).toBe(THIS)
  })

  it("moves on to next week once this week is published and next week isn't", () => {
    expect(landingWeek(THIS, published(THIS))).toBe(NEXT)
  })

  it("comes back to this week once both are published, to look at what's live", () => {
    expect(landingWeek(THIS, published(THIS, NEXT))).toBe(THIS)
  })
})
