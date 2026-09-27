import { describe, expect, it } from 'vitest'
import { ALL_OPEN } from './closed'
import { copyReport, nothingToCopy, planCopy } from './copy'

const shift = (staffId: number, date: string, start: number, end: number) => ({ staffId, date, start, end })
const person = (id: number, active = true) => ({ id, active })

// Copying 28 Sep – 4 Oct into 5 – 11 Oct
const LAST_WEEK = '2026-09-28'
const THIS_WEEK = '2026-10-05'

const TUE_CLOSED = [false, true, false, false, false, false, false]
const WED_CLOSED = [false, false, true, false, false, false, false]

describe('planCopy', () => {
  it('puts each shift on the same weekday of the new week, for the same person and times', () => {
    const plan = planCopy({
      from: [shift(1, '2026-09-28', 600, 1080), shift(2, '2026-10-01', 600, 1260), shift(1, '2026-10-04', 600, 960)],
      closedDays: ALL_OPEN,
      to: THIS_WEEK,
      staff: [person(1), person(2)],
    })
    expect(plan.shifts).toEqual([
      shift(1, '2026-10-05', 600, 1080),
      shift(2, '2026-10-08', 600, 1260),
      shift(1, '2026-10-11', 600, 960),
    ])
  })

  it('brings both halves of a split shift', () => {
    const plan = planCopy({
      from: [shift(1, '2026-09-30', 600, 840), shift(1, '2026-09-30', 1020, 1260)],
      closedDays: ALL_OPEN,
      to: THIS_WEEK,
      staff: [person(1)],
    })
    expect(plan.shifts).toEqual([shift(1, '2026-10-07', 600, 840), shift(1, '2026-10-07', 1020, 1260)])
  })

  it('lands on the same weekday from any number of weeks back', () => {
    const plan = planCopy({
      from: [shift(1, '2026-08-06', 600, 1260)],
      closedDays: ALL_OPEN,
      to: THIS_WEEK,
      staff: [person(1)],
    })
    expect(plan.shifts).toEqual([shift(1, '2026-10-08', 600, 1260)])
  })

  it('gives shifts only to people who had them, so anyone added since starts empty', () => {
    const plan = planCopy({
      from: [shift(1, '2026-09-28', 600, 1080)],
      closedDays: ALL_OPEN,
      to: THIS_WEEK,
      staff: [person(1), person(3)],
    })
    expect(plan.shifts.map((s) => s.staffId)).toEqual([1])
  })

  it('has nothing to copy from an empty week', () => {
    expect(planCopy({ from: [], closedDays: ALL_OPEN, to: THIS_WEEK, staff: [person(1)] })).toEqual({
      shifts: [],
      closedDays: ALL_OPEN,
      skipped: { inactive: 0, closed: 0 },
    })
  })

  it('takes only the person, date and times from each shift, never its id', () => {
    const saved = { id: 41, ...shift(1, '2026-09-28', 600, 1080) }
    expect(planCopy({ from: [saved], closedDays: ALL_OPEN, to: THIS_WEEK, staff: [person(1)] }).shifts).toEqual([
      shift(1, '2026-10-05', 600, 1080),
    ])
  })

  it('leaves the week it copies from as it was', () => {
    const from = [shift(1, '2026-09-28', 600, 1080)]
    const closedDays = [...TUE_CLOSED]
    planCopy({ from, closedDays, to: THIS_WEEK, staff: [person(1)] })
    expect(from).toEqual([shift(1, '2026-09-28', 600, 1080)])
    expect(closedDays).toEqual(TUE_CLOSED)
  })

  it('skips the shifts of staff no longer active, and counts them', () => {
    const plan = planCopy({
      from: [shift(1, '2026-09-28', 600, 1080), shift(2, '2026-09-28', 600, 1080), shift(2, '2026-09-29', 600, 960)],
      closedDays: ALL_OPEN,
      to: THIS_WEEK,
      staff: [person(1), person(2, false)],
    })
    expect(plan.shifts).toEqual([shift(1, '2026-10-05', 600, 1080)])
    expect(plan.skipped).toEqual({ inactive: 2, closed: 0 })
  })

  it('counts someone no longer on the staff list as no longer active', () => {
    const plan = planCopy({
      from: [shift(9, '2026-09-28', 600, 1080)],
      closedDays: ALL_OPEN,
      to: THIS_WEEK,
      staff: [person(1)],
    })
    expect(plan.shifts).toEqual([])
    expect(plan.skipped).toEqual({ inactive: 1, closed: 0 })
  })

  it('skips nothing when everyone is still active', () => {
    const plan = planCopy({
      from: [shift(1, '2026-09-28', 600, 1080)],
      closedDays: ALL_OPEN,
      to: THIS_WEEK,
      staff: [person(1)],
    })
    expect(plan.skipped).toEqual({ inactive: 0, closed: 0 })
  })

  it('brings the closed days of the week it copies from', () => {
    const plan = planCopy({
      from: [shift(1, '2026-09-28', 600, 1080)],
      closedDays: TUE_CLOSED,
      to: THIS_WEEK,
      staff: [person(1)],
    })
    expect(plan.closedDays).toEqual(TUE_CLOSED)
  })

  it('brings every day open when the week it copies from had none closed', () => {
    const plan = planCopy({
      from: [shift(1, '2026-09-28', 600, 1080)],
      closedDays: ALL_OPEN,
      to: THIS_WEEK,
      staff: [person(1)],
    })
    expect(plan.closedDays).toEqual(ALL_OPEN)
  })

  it('skips a shift that would land on a closed day, and counts it', () => {
    const plan = planCopy({
      from: [shift(1, '2026-09-28', 600, 1080), shift(1, '2026-09-29', 600, 1080), shift(2, '2026-09-29', 600, 960)],
      closedDays: TUE_CLOSED,
      to: THIS_WEEK,
      staff: [person(1), person(2)],
    })
    expect(plan.shifts).toEqual([shift(1, '2026-10-05', 600, 1080)])
    expect(plan.skipped).toEqual({ inactive: 0, closed: 2 })
  })

  it('counts a shift once, as for staff no longer active, when it would also land on a closed day', () => {
    const plan = planCopy({
      from: [shift(2, '2026-09-29', 600, 1080)],
      closedDays: TUE_CLOSED,
      to: THIS_WEEK,
      staff: [person(2, false)],
    })
    expect(plan.skipped).toEqual({ inactive: 1, closed: 0 })
  })
})

describe('copyReport', () => {
  const week = (n: number, staffId = 1, date = '2026-09-28') =>
    Array.from({ length: n }, () => shift(staffId, date, 600, 1080))

  it('says how many shifts came across, and from which week', () => {
    const plan = planCopy({ from: week(12), closedDays: ALL_OPEN, to: THIS_WEEK, staff: [person(1)] })
    expect(copyReport(plan, LAST_WEEK, ALL_OPEN)).toBe('12 shifts copied from 28 Sep – 4 Oct.')
  })

  it('names the shifts skipped for staff no longer active', () => {
    const plan = planCopy({
      from: [...week(12), ...week(1, 2)],
      closedDays: ALL_OPEN,
      to: THIS_WEEK,
      staff: [person(1), person(2, false)],
    })
    expect(copyReport(plan, LAST_WEEK, ALL_OPEN)).toBe(
      '12 shifts copied from 28 Sep – 4 Oct. Skipped 1 for staff no longer active.',
    )
  })

  it('names the shifts skipped on a closed day', () => {
    const plan = planCopy({
      from: [...week(12), ...week(2, 1, '2026-09-29')],
      closedDays: TUE_CLOSED,
      to: THIS_WEEK,
      staff: [person(1)],
    })
    expect(copyReport(plan, LAST_WEEK, TUE_CLOSED)).toBe(
      '12 shifts copied from 28 Sep – 4 Oct. Skipped 2 on a day this week is closed.',
    )
  })

  it('names every kind of skip in one sentence', () => {
    const plan = planCopy({
      from: [...week(12), ...week(1, 2), ...week(1, 1, '2026-09-29')],
      closedDays: TUE_CLOSED,
      to: THIS_WEEK,
      staff: [person(1), person(2, false)],
    })
    expect(copyReport(plan, LAST_WEEK, TUE_CLOSED)).toBe(
      '12 shifts copied from 28 Sep – 4 Oct. Skipped 1 for staff no longer active, 1 on a day this week is closed.',
    )
  })

  it('says shift, not shifts, for one', () => {
    const plan = planCopy({ from: week(1), closedDays: ALL_OPEN, to: THIS_WEEK, staff: [person(1)] })
    expect(copyReport(plan, LAST_WEEK, ALL_OPEN)).toBe('1 shift copied from 28 Sep – 4 Oct.')
  })

  it('says which days closed to match the week it copied', () => {
    const plan = planCopy({ from: week(12), closedDays: TUE_CLOSED, to: THIS_WEEK, staff: [person(1)] })
    expect(copyReport(plan, LAST_WEEK, ALL_OPEN)).toBe(
      '12 shifts copied from 28 Sep – 4 Oct. Tue closed, to match that week.',
    )
  })

  it('says which days reopened to match the week it copied', () => {
    const plan = planCopy({ from: week(12), closedDays: ALL_OPEN, to: THIS_WEEK, staff: [person(1)] })
    expect(copyReport(plan, LAST_WEEK, WED_CLOSED)).toBe(
      '12 shifts copied from 28 Sep – 4 Oct. Wed reopened, to match that week.',
    )
  })

  it('names every day that changed, closed and reopened', () => {
    const plan = planCopy({
      from: week(12),
      closedDays: [false, true, false, false, false, false, true],
      to: THIS_WEEK,
      staff: [person(1)],
    })
    expect(copyReport(plan, LAST_WEEK, WED_CLOSED)).toBe(
      '12 shifts copied from 28 Sep – 4 Oct. Tue, Sun closed and Wed reopened, to match that week.',
    )
  })

  it('says nothing of closed days that were already the same', () => {
    const plan = planCopy({ from: week(12), closedDays: TUE_CLOSED, to: THIS_WEEK, staff: [person(1)] })
    expect(copyReport(plan, LAST_WEEK, TUE_CLOSED)).toBe('12 shifts copied from 28 Sep – 4 Oct.')
  })

  it('names the closed days that changed before the skips', () => {
    const plan = planCopy({
      from: [...week(12), ...week(1, 2)],
      closedDays: TUE_CLOSED,
      to: THIS_WEEK,
      staff: [person(1), person(2, false)],
    })
    expect(copyReport(plan, LAST_WEEK, ALL_OPEN)).toBe(
      '12 shifts copied from 28 Sep – 4 Oct. Tue closed, to match that week. Skipped 1 for staff no longer active.',
    )
  })
})

describe('nothingToCopy', () => {
  it('names the empty week', () => {
    expect(nothingToCopy(LAST_WEEK)).toBe('28 Sep – 4 Oct has no shifts on it.')
  })

  it('names the empty week when a plan of it has nothing skipped', () => {
    const plan = planCopy({ from: [], closedDays: ALL_OPEN, to: THIS_WEEK, staff: [person(1)] })
    expect(nothingToCopy(LAST_WEEK, plan.skipped)).toBe('28 Sep – 4 Oct has no shifts on it.')
  })

  it('says why when every shift was skipped, and that this week is unchanged', () => {
    const plan = planCopy({
      from: [shift(2, '2026-09-28', 600, 1080)],
      closedDays: ALL_OPEN,
      to: THIS_WEEK,
      staff: [person(2, false)],
    })
    expect(nothingToCopy(LAST_WEEK, plan.skipped)).toBe(
      'Nothing on 28 Sep – 4 Oct can come across, so this week is unchanged. Skipped 1 for staff no longer active.',
    )
  })

  it('says why when every shift would land on a closed day', () => {
    const plan = planCopy({
      from: [shift(1, '2026-09-29', 600, 1080)],
      closedDays: TUE_CLOSED,
      to: THIS_WEEK,
      staff: [person(1)],
    })
    expect(nothingToCopy(LAST_WEEK, plan.skipped)).toBe(
      'Nothing on 28 Sep – 4 Oct can come across, so this week is unchanged. Skipped 1 on a day this week is closed.',
    )
  })
})
