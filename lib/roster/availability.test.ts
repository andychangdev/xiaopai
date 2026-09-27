import { describe, expect, it } from 'vitest'
import { isUsuallyAvailable, notUsuallyAvailableNote, withDayAvailable } from './availability'
import { EVERY_DAY } from './staff'

// Every day but Sunday
const NOT_SUNDAY = [true, true, true, true, true, true, false]

describe('isUsuallyAvailable', () => {
  it("is true on a weekday in the person's pattern", () => {
    expect(isUsuallyAvailable(NOT_SUNDAY, '2026-10-05')).toBe(true)
    expect(isUsuallyAvailable(NOT_SUNDAY, '2026-10-10')).toBe(true)
  })

  it('is false on a weekday outside it', () => {
    expect(isUsuallyAvailable(NOT_SUNDAY, '2026-10-11')).toBe(false)
  })

  it('goes by the weekday, whatever the week', () => {
    expect(isUsuallyAvailable(NOT_SUNDAY, '2026-12-27')).toBe(false)
  })
})

describe('withDayAvailable', () => {
  it('takes one weekday out of the pattern and leaves the rest', () => {
    expect(withDayAvailable(EVERY_DAY, 1, false)).toEqual([true, false, true, true, true, true, true])
  })

  it('puts a weekday back', () => {
    expect(withDayAvailable(NOT_SUNDAY, 6, true)).toEqual(EVERY_DAY)
  })

  it('leaves the pattern it was given as it was', () => {
    const days = [...EVERY_DAY]
    withDayAvailable(days, 1, false)
    expect(days).toEqual(EVERY_DAY)
  })
})

describe('notUsuallyAvailableNote', () => {
  it('says who and which weekday, by first name', () => {
    expect(notUsuallyAvailableNote('John Reyes', '2026-10-11')).toBe("John — isn't usually available on Sun")
  })
})
