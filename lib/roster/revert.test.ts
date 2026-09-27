import { describe, expect, it } from 'vitest'
import { ALL_OPEN } from './closed'
import { changedSince, snapshotOf } from './publish'
import { nothingToRevert, planRevert, revertQuestion, revertReport, type RevertPlan } from './revert'
import { rosterDays } from './rosterText'
import type { Shift } from './shifts'

// 5 – 11 Oct 2026, published with Tuesday closed
const WEEK = '2026-10-05'
const [MON, TUE, WED] = ['05', '06', '07'].map((d) => `2026-10-${d}`)
const TUE_CLOSED = [false, true, false, false, false, false, false]

const JOHN = { id: 1, name: 'John Reyes' }
const LISA = { id: 4, name: 'Lisa Chen' }

let nextId = 1
const h = (hours: number) => hours * 60
const shift = (who: { id: number }, date: string, start: number, end: number): Shift => ({
  id: nextId++,
  staffId: who.id,
  date,
  start: h(start),
  end: h(end),
})

const PUBLISHED = [shift(JOHN, MON, 10, 18), shift(LISA, MON, 10, 16), shift(LISA, WED, 10, 14), shift(LISA, WED, 17, 21)]
const days = (shifts: Shift[], closedDays = TUE_CLOSED) =>
  rosterDays({ weekStart: WEEK, staff: [JOHN, LISA], shifts, closedDays })
const snapshot = snapshotOf({ weekStart: WEEK, days: days(PUBLISHED), today: '2026-09-27', previous: null })

type Input = Parameters<typeof planRevert>[0]

// From the published week, with Tuesday still closed, both still on the staff list and no one on leave
const revert = (input: Pick<Input, 'shifts'> & Partial<Input>) =>
  planRevert({ snapshot, closedDays: TUE_CLOSED, staffIds: new Set([JOHN.id, LISA.id]), leave: [], ...input })

/** The week's shifts once the plan is carried out, the added ones given new ids. */
const applied = (now: Shift[], plan: RevertPlan) => [
  ...now.filter((s) => !plan.remove.includes(s.id)),
  ...plan.add.map((s) => ({ ...s, id: nextId++ })),
]

describe('planRevert', () => {
  it('takes off a shift added since', () => {
    const extra = shift(JOHN, WED, 10, 18)
    const plan = revert({ shifts: [...PUBLISHED, extra] })
    expect(plan).toMatchObject({ remove: [extra.id], add: [], changes: true })
  })

  it('puts back a shift removed since, with its times', () => {
    const plan = revert({ shifts: PUBLISHED.slice(1) })
    expect(plan).toMatchObject({ remove: [], add: [{ staffId: JOHN.id, date: MON, start: h(10), end: h(18) }] })
  })

  it('puts a retimed shift back to its published times', () => {
    const moved = { ...PUBLISHED[0], end: h(17) }
    const plan = revert({ shifts: [moved, ...PUBLISHED.slice(1)] })
    expect(plan).toMatchObject({ remove: [moved.id], add: [{ staffId: JOHN.id, date: MON, start: h(10), end: h(18) }] })
  })

  it('leaves the shifts that match alone, so they keep their ids', () => {
    const plan = revert({ shifts: [...PUBLISHED, shift(JOHN, WED, 10, 18)] })
    expect(plan.remove).not.toContain(PUBLISHED[0].id)
    expect(plan.add).toEqual([])
  })

  it('keeps one of two identical shifts when the published version had one', () => {
    const twin = { ...PUBLISHED[0], id: nextId++ }
    expect(revert({ shifts: [...PUBLISHED, twin] }).remove).toEqual([twin.id])
  })

  it('puts the closed days back, removing shifts on a day that was closed', () => {
    const onTue = shift(JOHN, TUE, 10, 18)
    const plan = revert({ shifts: [...PUBLISHED, onTue], closedDays: ALL_OPEN })
    expect(plan).toMatchObject({ closedDays: TUE_CLOSED, remove: [onTue.id], changes: true })
  })

  it('reopens a day closed since, with its shifts', () => {
    const wedClosed = [false, true, true, false, false, false, false]
    const plan = revert({ shifts: PUBLISHED.slice(0, 2), closedDays: wedClosed })
    expect(plan.closedDays).toEqual(TUE_CLOSED)
    expect(plan.add).toEqual([
      { staffId: LISA.id, date: WED, start: h(10), end: h(14) },
      { staffId: LISA.id, date: WED, start: h(17), end: h(21) },
    ])
  })

  it('leaves out shifts for someone on leave that day, or no longer on the staff list', () => {
    const plan = revert({
      shifts: [],
      staffIds: new Set([LISA.id]),
      leave: [{ staffId: LISA.id, fromDate: WED, toDate: WED }],
    })
    expect(plan.add).toEqual([{ staffId: LISA.id, date: MON, start: h(10), end: h(16) }])
    expect(plan.skipped).toEqual({ gone: 1, onLeave: 2 })
  })

  it('keeps a published shift still there on a day the person has since booked leave', () => {
    const plan = revert({ shifts: PUBLISHED, leave: [{ staffId: LISA.id, fromDate: WED, toDate: WED }] })
    expect(plan).toMatchObject({ remove: [], add: [], skipped: { gone: 0, onLeave: 0 }, changes: false })
  })

  it('changes nothing when the week is as published', () => {
    expect(revert({ shifts: PUBLISHED }).changes).toBe(false)
  })

  it('leaves the week reading as published once carried out', () => {
    const now = [
      { ...PUBLISHED[0], end: h(17) },
      PUBLISHED[2],
      shift(JOHN, TUE, 10, 18),
      shift(LISA, WED, 10, 14), // the same times twice
    ]
    const closed = [false, false, false, false, false, true, false]
    const plan = revert({ shifts: now, closedDays: closed })
    expect(changedSince(snapshot, days(applied(now, plan), plan.closedDays))).toBe(false)
  })
})

describe('revertQuestion', () => {
  it('names the version and when it went out', () => {
    expect(revertQuestion({ version: 2, publishedAt: '2026-09-27' })).toEqual({
      title: 'Revert to v2?',
      body: "Puts the week's shifts and closed days back as they were published on 27 Sep 2026. The changes made since are discarded, though Undo can bring them back.",
      ok: 'Revert to v2',
    })
  })
})

describe('revertReport', () => {
  it('says nothing when everything came back', () => {
    expect(revertReport(revert({ shifts: [] }), 1)).toBe('')
  })

  it('names what was left out, and that staff still need telling', () => {
    const plan = revert({ shifts: [], leave: [{ staffId: LISA.id, fromDate: WED, toDate: WED }] })
    expect(revertReport(plan, 1)).toBe(
      "The week is back to v1, less 2 shifts now on booked leave, which can't come back. It still differs from what staff have, so Publish update to tell them.",
    )
  })
})

describe('nothingToRevert', () => {
  it('names what stands between the week and the published version', () => {
    const plan = revert({ shifts: PUBLISHED.slice(1), staffIds: new Set([LISA.id]) })
    expect(nothingToRevert(plan, 3)).toBe(
      "Nothing more can go back to v3: 1 shift for someone no longer on the staff list can't come back. Publish update to tell staff.",
    )
  })
})
