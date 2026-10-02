import { describe, expect, it } from 'vitest'
import type { PublishState } from './publish'
import { menuWeeks, weekMenu } from './weekMenu'

const draft: PublishState = { status: 'draft' }
const live: PublishState = { status: 'published', version: 1, publishedAt: '2026-09-25', changed: false }

describe('menuWeeks', () => {
  it('is the four weeks after the open one, the open week and the two before it, newest first', () => {
    expect(menuWeeks('2026-09-28')).toEqual([
      '2026-10-26',
      '2026-10-19',
      '2026-10-12',
      '2026-10-05',
      '2026-09-28',
      '2026-09-21',
      '2026-09-14',
    ])
  })

  it('moves with the open week, however far it is from this one', () => {
    const weeks = menuWeeks('2026-12-07')
    expect([weeks[0], weeks[4], weeks.at(-1)]).toEqual(['2027-01-04', '2026-12-07', '2026-11-23'])
  })

  it('crosses the new year like any other week', () => {
    expect(menuWeeks('2026-12-14').slice(0, 3)).toEqual(['2027-01-11', '2027-01-04', '2026-12-28'])
  })
})

describe('weekMenu', () => {
  const states = (weeks: string[]) => weeks.map((weekStart) => ({ weekStart, shifts: 0, state: draft }))

  it('names the weeks next to this one, and the rest by their week of the year', () => {
    const items = weekMenu({ thisWeek: '2026-09-28', open: '2026-09-28', weeks: states(menuWeeks('2026-09-28')) })
    expect(items.map((i) => i.label)).toEqual(['Week 44', 'Week 43', 'Week 42', 'Next week', 'This week', 'Last week', 'Week 38'])
  })

  it('still names them from this week when another week is open', () => {
    const items = weekMenu({ thisWeek: '2026-09-28', open: '2026-10-12', weeks: states(menuWeeks('2026-10-12')) })
    expect(items.map((i) => i.label).slice(-3)).toEqual(['Week 42', 'Next week', 'This week'])
  })

  it('numbers weeks across the new year by the year most of each is in', () => {
    const items = weekMenu({ thisWeek: '2026-12-21', open: '2026-12-21', weeks: states(['2027-01-04', '2026-12-28']) })
    expect(items.map((i) => i.label)).toEqual(['Week 1', 'Next week'])
  })

  it('marks the open week, and only that one', () => {
    const items = weekMenu({ thisWeek: '2026-09-28', open: '2026-10-05', weeks: states(['2026-10-05', '2026-09-28']) })
    expect(items.map((i) => i.open)).toEqual([true, false])
  })

  it('calls a week with no shifts that never went out empty', () => {
    const [item] = weekMenu({ thisWeek: '2026-09-28', open: '2026-09-28', weeks: [{ weekStart: '2026-09-28', shifts: 0, state: draft }] })
    expect(item.state).toBeNull()
  })

  it('keeps the state of a week with shifts, or one published and emptied since', () => {
    const items = weekMenu({
      thisWeek: '2026-09-28',
      open: '2026-09-28',
      weeks: [
        { weekStart: '2026-09-28', shifts: 4, state: draft },
        { weekStart: '2026-09-21', shifts: 0, state: { ...live, changed: true } },
      ],
    })
    expect(items.map((i) => i.state)).toEqual([draft, { ...live, changed: true }])
  })
})
