import { describe, expect, it } from 'vitest'
import { ALL_OPEN, closedThisWeek, dayClosedError, isClosed, withDayClosed } from './closed'

// 5 – 11 Oct 2026, with Tuesday shut
const TUE_CLOSED = [false, true, false, false, false, false, false]

describe('isClosed', () => {
  it('is true for a date whose weekday is closed', () => {
    expect(isClosed(TUE_CLOSED, '2026-10-06')).toBe(true)
  })

  it('is false for a date whose weekday is open', () => {
    expect(isClosed(TUE_CLOSED, '2026-10-05')).toBe(false)
    expect(isClosed(TUE_CLOSED, '2026-10-11')).toBe(false)
  })

  it('has every day open in a week that starts all open', () => {
    expect(isClosed(ALL_OPEN, '2026-10-06')).toBe(false)
  })
})

describe('withDayClosed', () => {
  it("closes the date's weekday and leaves the others as they were", () => {
    expect(withDayClosed(TUE_CLOSED, '2026-10-10', true)).toEqual([false, true, false, false, false, true, false])
  })

  it("reopens the date's weekday", () => {
    expect(withDayClosed(TUE_CLOSED, '2026-10-06', false)).toEqual(ALL_OPEN)
  })

  it('changes nothing when the day is already that way', () => {
    expect(withDayClosed(TUE_CLOSED, '2026-10-06', true)).toEqual(TUE_CLOSED)
  })

  it('leaves the days it was given as they were', () => {
    const days = [...ALL_OPEN]
    withDayClosed(days, '2026-10-06', true)
    expect(days).toEqual(ALL_OPEN)
  })
})

describe('closedThisWeek', () => {
  it('names the one day closed', () => {
    expect(closedThisWeek(TUE_CLOSED)).toBe('Tue closed this week')
  })

  it('names each day closed, in weekday order', () => {
    expect(closedThisWeek([false, true, false, false, false, false, true])).toBe('Tue, Sun closed this week')
  })

  it('has nothing to say when every day is open', () => {
    expect(closedThisWeek(ALL_OPEN)).toBeNull()
  })
})

describe('dayClosedError', () => {
  it('names the day and says how to reopen it', () => {
    expect(dayClosedError('2026-10-06')).toBe('Tue is closed this week. Click its heading to reopen it.')
  })
})
