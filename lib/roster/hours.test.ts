import { describe, expect, it } from 'vitest'
import { againstExpected, hoursAgainst, hoursAgainstShort, hoursFor, weekTotal } from './hours'

const shift = (staffId: number, start: number, end: number) => ({ staffId, start, end })

const h = (hours: number) => hours * 60

describe('hoursFor', () => {
  it("adds up one person's shifts, end − start with no breaks", () => {
    expect(hoursFor(7, [shift(7, 600, 1080), shift(7, 600, 1260)])).toBe(h(19))
  })

  it("leaves out everyone else's", () => {
    expect(hoursFor(7, [shift(7, 600, 1080), shift(8, 600, 960)])).toBe(h(8))
  })

  it('counts both halves of a split shift', () => {
    expect(hoursFor(7, [shift(7, 600, 840), shift(7, 1020, 1260)])).toBe(h(8))
  })

  it('keeps part hours', () => {
    expect(hoursFor(7, [shift(7, 600, 870)])).toBe(270)
  })

  it('is nothing for someone with no shifts', () => {
    expect(hoursFor(7, [shift(8, 600, 1080)])).toBe(0)
    expect(hoursFor(7, [])).toBe(0)
  })
})

describe('weekTotal', () => {
  it("adds up everyone's shifts", () => {
    expect(weekTotal([shift(7, 600, 1080), shift(8, 600, 960), shift(8, 1020, 1260)])).toBe(h(18))
  })

  it('is nothing for an empty week', () => {
    expect(weekTotal([])).toBe(0)
  })
})

describe('againstExpected', () => {
  it('is over at more than 20% above expected', () => {
    expect(againstExpected(h(24) + 1, 20)).toBe('over')
    expect(againstExpected(h(38), 24)).toBe('over')
  })

  it('is not highlighted at exactly 20% above', () => {
    expect(againstExpected(h(24), 20)).toBeNull()
  })

  it('is under at more than 20% below expected', () => {
    expect(againstExpected(h(16) - 1, 20)).toBe('under')
    expect(againstExpected(h(8), 24)).toBe('under')
  })

  it('is not highlighted at exactly 20% below', () => {
    expect(againstExpected(h(16), 20)).toBeNull()
  })

  // 12 × 1.2 and 12 × 0.8 aren't exact in floating point
  it('holds the boundaries where multiplying by 1.2 or 0.8 would round wrong', () => {
    expect(againstExpected(h(14.4), 12)).toBeNull()
    expect(againstExpected(h(9.6), 12)).toBeNull()
  })

  it('is not highlighted within 20%', () => {
    expect(againstExpected(h(24), 24)).toBeNull()
    expect(againstExpected(h(28), 24)).toBeNull()
    expect(againstExpected(h(20), 24)).toBeNull()
  })

  it('never highlights someone with no expected hours', () => {
    expect(againstExpected(h(60), null)).toBeNull()
    expect(againstExpected(h(1), null)).toBeNull()
  })

  it('never highlights someone with no hours this week', () => {
    expect(againstExpected(0, 24)).toBeNull()
  })
})

describe('hoursAgainst', () => {
  it('gives the hours against the expected hours, for a row heading', () => {
    expect(hoursAgainst(h(24), 24)).toBe('24h of 24h')
    expect(hoursAgainst(450, 20)).toBe('7.5h of 20h')
  })

  it('gives just the hours for someone with no expected hours', () => {
    expect(hoursAgainst(h(24), null)).toBe('24h')
    expect(hoursAgainst(0, null)).toBe('0h')
  })
})

describe('hoursAgainstShort', () => {
  it('gives the hours over the expected hours, for the Hours this week panel', () => {
    expect(hoursAgainstShort(h(24), 24)).toBe('24h/24')
    expect(hoursAgainstShort(0, 20)).toBe('0h/20')
  })

  it('gives just the hours for someone with no expected hours', () => {
    expect(hoursAgainstShort(h(24), null)).toBe('24h')
  })
})
