import { describe, expect, it } from 'vitest'
import {
  NOTHING_TO_PUBLISH,
  changedSince,
  landingWeek,
  needsPublishing,
  nothingToPublish,
  publishQuestion,
  publishState,
  publishStatus,
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

  it('is unchanged when two shifts starting together are saved again the other way round', () => {
    const [short, long] = [shift(LISA, WED, 10, 14), shift(LISA, WED, 10, 18)]
    const before = snapshotOf({ weekStart: WEEK, days: days(undefined, [short, long]), today: '2026-09-27', previous: null })
    // The short one removed and added back, so it now has the later id
    expect(changedSince(before, days(undefined, [long, { ...short, id: nextId++ }]))).toBe(false)
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

describe('publishStatus', () => {
  it('names each of the three states', () => {
    expect(publishStatus({ status: 'draft' })).toEqual({ label: 'Draft', note: 'not sent to staff yet' })
    expect(publishStatus({ status: 'published', version: 1, publishedAt: '2026-09-26', changed: false })).toEqual({
      label: 'Published v1',
      note: '26 Sep',
    })
    expect(publishStatus({ status: 'published', version: 2, publishedAt: '2026-09-26', changed: true })).toEqual({
      label: 'Unpublished changes',
      note: null,
    })
  })
})

describe('weekSubtitle', () => {
  it('says the week of the year, and draft until published', () => {
    expect(weekSubtitle(WEEK, { status: 'draft' })).toBe('Week 41 · Draft')
  })

  it('says when it was published, with the version from v2, and whether it has been edited since', () => {
    const at = { status: 'published' as const, publishedAt: '2026-09-26' }
    expect(weekSubtitle(WEEK, { ...at, version: 1, changed: false })).toBe('Week 41 · Published 26 Sep 2026')
    expect(weekSubtitle(WEEK, { ...at, version: 2, changed: true })).toBe(
      'Week 41 · Published 26 Sep 2026 · v2 · edited since',
    )
  })
})

describe('publishQuestion', () => {
  const ask = { weekStart: WEEK, shifts: 12, minutes: h(96) }

  it('names the shifts and hours of a first publish, and where it goes next', () => {
    expect(publishQuestion({ ...ask, state: { status: 'draft' }, warnings: 0 })).toEqual({
      title: 'Publish this week?',
      body: '12 shifts, 96h across 5 Oct – 11 Oct. This becomes the version staff work from, and Share roster opens ready to copy.',
      ok: 'Publish',
    })
  })

  it('names the new version of an update', () => {
    const state = { status: 'published' as const, version: 1, publishedAt: '2026-09-26', changed: true }
    expect(publishQuestion({ ...ask, state, warnings: 0 })).toEqual({
      title: 'Publish an update?',
      body: '12 shifts, 96h across 5 Oct – 11 Oct. This becomes version 2.',
      ok: 'Publish v2',
    })
  })

  it("says how many warnings are outstanding, and that they don't stop it", () => {
    const body = (warnings: number) => publishQuestion({ ...ask, state: { status: 'draft' }, warnings }).body
    expect(body(3)).toMatch(/ 3 warnings are outstanding — publishing goes ahead anyway\.$/)
    expect(body(1)).toMatch(/ 1 warning is outstanding — publishing goes ahead anyway\.$/)
  })

  it('says there are no shifts in an update that took them all out', () => {
    const state = { status: 'published' as const, version: 1, publishedAt: '2026-09-26', changed: true }
    expect(publishQuestion({ ...ask, shifts: 0, minutes: 0, state, warnings: 0 }).body).toMatch(
      /^No shifts across 5 Oct – 11 Oct\. This becomes version 2/,
    )
  })

  it('says shift, not shifts, for one', () => {
    expect(publishQuestion({ ...ask, shifts: 1, minutes: h(8), state: { status: 'draft' }, warnings: 0 }).body).toMatch(
      /^1 shift, 8h across/,
    )
  })
})

describe('nothingToPublish', () => {
  const published = { status: 'published' as const, version: 1, publishedAt: '2026-09-26' }

  it('is true of a week never published that has no shifts', () => {
    expect(nothingToPublish({ status: 'draft' }, 0)).toBe(true)
    expect(nothingToPublish({ status: 'draft' }, 3)).toBe(false)
  })

  it("is false of a published week emptied since, so staff can be told it's changed", () => {
    expect(nothingToPublish({ ...published, changed: true }, 0)).toBe(false)
  })
})

describe('NOTHING_TO_PUBLISH', () => {
  it('says why an empty week has nothing to publish', () => {
    expect(NOTHING_TO_PUBLISH).toBe('This week has no shifts on it yet.')
  })
})

describe('needsPublishing', () => {
  const published = { status: 'published' as const, version: 1, publishedAt: '2026-09-26' }

  it('is true of a draft, and of a published week changed since', () => {
    expect(needsPublishing({ status: 'draft' })).toBe(true)
    expect(needsPublishing({ ...published, changed: true })).toBe(true)
  })

  it('is false of a published week as it went out', () => {
    expect(needsPublishing({ ...published, changed: false })).toBe(false)
  })
})

describe('landingWeek', () => {
  const THIS = '2026-09-28'
  const NEXT = '2026-10-05'
  // Every week needs work but the ones named
  const done = (...weeks: string[]) => (week: string) => !weeks.includes(week)

  it('is this week while it needs work', () => {
    expect(landingWeek(THIS, done())).toBe(THIS)
    expect(landingWeek(THIS, done(NEXT))).toBe(THIS)
  })

  it("moves on to next week once this week is done and next week isn't", () => {
    expect(landingWeek(THIS, done(THIS))).toBe(NEXT)
  })

  it("comes back to this week once both are done, to look at what's live", () => {
    expect(landingWeek(THIS, done(THIS, NEXT))).toBe(THIS)
  })
})
