import { describe, expect, it } from 'vitest'
import { copyReport, nothingToCopy, planCopy } from './copy'

const shift = (staffId: number, date: string, start: number, end: number) => ({ staffId, date, start, end })
const person = (id: number, active = true) => ({ id, active })

// Copying 28 Sep – 4 Oct into 5 – 11 Oct
const LAST_WEEK = '2026-09-28'
const THIS_WEEK = '2026-10-05'

describe('planCopy', () => {
  it('puts each shift on the same weekday of the new week, for the same person and times', () => {
    const plan = planCopy({
      from: [shift(1, '2026-09-28', 600, 1080), shift(2, '2026-10-01', 600, 1260), shift(1, '2026-10-04', 600, 960)],
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
      to: THIS_WEEK,
      staff: [person(1)],
    })
    expect(plan.shifts).toEqual([shift(1, '2026-10-07', 600, 840), shift(1, '2026-10-07', 1020, 1260)])
  })

  it('lands on the same weekday from any number of weeks back', () => {
    const plan = planCopy({ from: [shift(1, '2026-08-06', 600, 1260)], to: THIS_WEEK, staff: [person(1)] })
    expect(plan.shifts).toEqual([shift(1, '2026-10-08', 600, 1260)])
  })

  it('gives shifts only to people who had them, so anyone added since starts empty', () => {
    const plan = planCopy({ from: [shift(1, '2026-09-28', 600, 1080)], to: THIS_WEEK, staff: [person(1), person(3)] })
    expect(plan.shifts.map((s) => s.staffId)).toEqual([1])
  })

  it('has nothing to copy from an empty week', () => {
    expect(planCopy({ from: [], to: THIS_WEEK, staff: [person(1)] })).toEqual({ shifts: [], skipped: { inactive: 0 } })
  })

  it('takes only the person, date and times from each shift, never its id', () => {
    const saved = { id: 41, ...shift(1, '2026-09-28', 600, 1080) }
    expect(planCopy({ from: [saved], to: THIS_WEEK, staff: [person(1)] }).shifts).toEqual([
      shift(1, '2026-10-05', 600, 1080),
    ])
  })

  it('leaves the week it copies from as it was', () => {
    const from = [shift(1, '2026-09-28', 600, 1080)]
    planCopy({ from, to: THIS_WEEK, staff: [person(1)] })
    expect(from).toEqual([shift(1, '2026-09-28', 600, 1080)])
  })

  it('skips the shifts of staff no longer active, and counts them', () => {
    const plan = planCopy({
      from: [shift(1, '2026-09-28', 600, 1080), shift(2, '2026-09-28', 600, 1080), shift(2, '2026-09-29', 600, 960)],
      to: THIS_WEEK,
      staff: [person(1), person(2, false)],
    })
    expect(plan.shifts).toEqual([shift(1, '2026-10-05', 600, 1080)])
    expect(plan.skipped).toEqual({ inactive: 2 })
  })

  it('counts someone no longer on the staff list as no longer active', () => {
    const plan = planCopy({ from: [shift(9, '2026-09-28', 600, 1080)], to: THIS_WEEK, staff: [person(1)] })
    expect(plan.shifts).toEqual([])
    expect(plan.skipped).toEqual({ inactive: 1 })
  })

  it('skips nothing when everyone is still active', () => {
    const plan = planCopy({ from: [shift(1, '2026-09-28', 600, 1080)], to: THIS_WEEK, staff: [person(1)] })
    expect(plan.skipped).toEqual({ inactive: 0 })
  })
})

describe('copyReport', () => {
  const week = (n: number, staffId = 1) => Array.from({ length: n }, () => shift(staffId, '2026-09-28', 600, 1080))

  it('says how many shifts came across, and from which week', () => {
    const plan = planCopy({ from: week(12), to: THIS_WEEK, staff: [person(1)] })
    expect(copyReport(plan, LAST_WEEK)).toBe('12 shifts copied from 28 Sep – 4 Oct.')
  })

  it('names the shifts skipped for staff no longer active', () => {
    const plan = planCopy({ from: [...week(12), ...week(1, 2)], to: THIS_WEEK, staff: [person(1), person(2, false)] })
    expect(copyReport(plan, LAST_WEEK)).toBe(
      '12 shifts copied from 28 Sep – 4 Oct. Skipped 1 for staff no longer active.',
    )
  })

  it('says shift, not shifts, for one', () => {
    const plan = planCopy({ from: week(1), to: THIS_WEEK, staff: [person(1)] })
    expect(copyReport(plan, LAST_WEEK)).toBe('1 shift copied from 28 Sep – 4 Oct.')
  })
})

describe('nothingToCopy', () => {
  it('names the empty week', () => {
    expect(nothingToCopy(LAST_WEEK)).toBe('28 Sep – 4 Oct has no shifts on it.')
  })

  it('names the empty week when a plan of it has nothing skipped', () => {
    const plan = planCopy({ from: [], to: THIS_WEEK, staff: [person(1)] })
    expect(nothingToCopy(LAST_WEEK, plan.skipped)).toBe('28 Sep – 4 Oct has no shifts on it.')
  })

  it('says why when every shift was skipped, and that this week is unchanged', () => {
    const plan = planCopy({ from: [shift(2, '2026-09-28', 600, 1080)], to: THIS_WEEK, staff: [person(2, false)] })
    expect(nothingToCopy(LAST_WEEK, plan.skipped)).toBe(
      'Nothing on 28 Sep – 4 Oct can come across, so this week is unchanged. Skipped 1 for staff no longer active.',
    )
  })
})
