import { describe, expect, it } from 'vitest'
import { alreadyNaNote, markNaError, naNote, naReason } from './notAvailable'
import { EVERY_DAY } from './staff'

// 5 – 11 Oct 2026
const FRI = '2026-10-09'
const SUN = '2026-10-11'

const JOHN = { id: 7, available: EVERY_DAY }
const NOT_SUNDAY = { ...JOHN, available: [true, true, true, true, true, true, false] }

describe('naReason', () => {
  it('is marked on a day noted for this week', () => {
    expect(naReason(JOHN, FRI, [{ staffId: 7, date: FRI }])).toBe('marked')
  })

  it("is usual on a weekday outside the person's pattern", () => {
    expect(naReason(NOT_SUNDAY, SUN, [])).toBe('usual')
  })

  it('is marked when both apply, since the note is the more particular', () => {
    expect(naReason(NOT_SUNDAY, SUN, [{ staffId: 7, date: SUN }])).toBe('marked')
  })

  it('is null on a day they can usually work with no note', () => {
    expect(naReason(NOT_SUNDAY, FRI, [])).toBeNull()
  })

  it("goes by the person's own note on that date only", () => {
    expect(naReason(JOHN, FRI, [{ staffId: 8, date: FRI }])).toBeNull()
    expect(naReason(JOHN, FRI, [{ staffId: 7, date: '2026-10-08' }])).toBeNull()
  })
})

describe('naNote', () => {
  it('says who and which day it was marked for, by first name', () => {
    expect(naNote('marked', 'John Reyes', FRI)).toBe('John — marked not available this Fri')
  })

  it("says which weekday they aren't usually available", () => {
    expect(naNote('usual', 'John Reyes', SUN)).toBe("John — isn't usually available on Sun")
  })
})

describe('alreadyNaNote', () => {
  it('says why the day needs no note, and where to change it', () => {
    expect(alreadyNaNote('John Reyes', SUN)).toBe(
      "Already N/A — John isn't usually available on Sun. Change that on the Staff page.",
    )
  })
})

describe('markNaError', () => {
  it('takes a note on a day the person can usually work', () => {
    expect(markNaError({ name: 'John Reyes', available: NOT_SUNDAY.available }, FRI)).toBeNull()
  })

  it("refuses one on a day their pattern already rules out, so it can't be stacked", () => {
    expect(markNaError({ name: 'John Reyes', available: NOT_SUNDAY.available }, SUN)).toBe(
      "Already N/A — John isn't usually available on Sun. Change that on the Staff page.",
    )
  })
})
