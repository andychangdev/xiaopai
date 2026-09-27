import { describe, expect, it } from 'vitest'
import { historyBadge, historyRows } from './history'
import type { PublishState } from './publish'

const h = (hours: number) => hours * 60
const shift = (start: number, end: number) => ({ start: h(start), end: h(end) })

const DRAFT = { status: 'draft' as const }
const PUBLISHED = { status: 'published' as const, version: 2, publishedAt: '2026-09-26', changed: false }

// Three weeks in September and October 2026
const [SEP_21, SEP_28, OCT_5] = ['2026-09-21', '2026-09-28', '2026-10-05']

const week = (weekStart: string, shifts: { start: number; end: number }[], state: PublishState = DRAFT) => ({
  weekStart,
  shifts,
  state,
})

describe('historyRows', () => {
  it('lists every week with shifts on it, newest first', () => {
    const rows = historyRows({
      open: OCT_5,
      weeks: [week(SEP_28, [shift(10, 18)]), week(OCT_5, [shift(10, 18)]), week(SEP_21, [shift(10, 16)])],
    })
    expect(rows.map((r) => r.weekStart)).toEqual([OCT_5, SEP_28, SEP_21])
  })

  it('leaves out a week with nothing on it but closed days or N/A notes', () => {
    const rows = historyRows({ open: OCT_5, weeks: [week(SEP_28, []), week(OCT_5, [shift(10, 18)])] })
    expect(rows.map((r) => r.weekStart)).toEqual([OCT_5])
  })

  it('keeps a published week that has been emptied since, as staff still hold what went out', () => {
    const emptied = { ...PUBLISHED, changed: true }
    const rows = historyRows({ open: OCT_5, weeks: [week(SEP_28, [], emptied)] })
    expect(rows.map((r) => [r.weekStart, r.shifts, r.state])).toEqual([
      [OCT_5, 0, DRAFT],
      [SEP_28, 0, emptied],
    ])
  })

  it('always lists the open week, even with no shifts, and marks it', () => {
    const rows = historyRows({ open: OCT_5, weeks: [week(SEP_28, [shift(10, 18)]), week(OCT_5, [])] })
    expect(rows.map((r) => [r.weekStart, r.open])).toEqual([
      [OCT_5, true],
      [SEP_28, false],
    ])
  })

  it('lists the open week when nothing is known about it yet', () => {
    const rows = historyRows({ open: OCT_5, weeks: [week(SEP_28, [shift(10, 18)])] })
    expect(rows[0]).toEqual({ weekStart: OCT_5, open: true, shifts: 0, minutes: 0, state: DRAFT })
  })

  it('counts each week’s shifts and hours', () => {
    const [row] = historyRows({
      open: OCT_5,
      weeks: [week(SEP_28, [shift(10, 18), shift(10, 21), shift(10, 14), shift(17, 21)])],
    }).filter((r) => !r.open)
    expect(row).toMatchObject({ shifts: 4, minutes: h(8 + 11 + 4 + 4) })
  })

  it('says where each week stands on publishing', () => {
    const rows = historyRows({
      open: OCT_5,
      weeks: [week(SEP_28, [shift(10, 18)], PUBLISHED), week(SEP_21, [shift(10, 18)])],
    })
    expect(rows.map((r) => r.state)).toEqual([DRAFT, PUBLISHED, DRAFT])
  })
})

describe('historyBadge', () => {
  it('is Draft, or Published with the version', () => {
    expect(historyBadge(DRAFT)).toBe('Draft')
    expect(historyBadge(PUBLISHED)).toBe('Published · v2')
  })

  it('still names the version once a published week has been edited since', () => {
    expect(historyBadge({ ...PUBLISHED, changed: true })).toBe('Published · v2')
  })
})
