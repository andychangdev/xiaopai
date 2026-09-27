import { describe, expect, it } from 'vitest'
import {
  addDays,
  canonicalWeek,
  dayLabel,
  daysBetween,
  dayName,
  fullDate,
  isInWeek,
  isMonday,
  isoDateOf,
  mondayOf,
  parseIsoDate,
  shortDate,
  weekDates,
  weekRange,
  weekTitle,
  weekdayIndex,
} from './dates'

describe('parseIsoDate', () => {
  it('accepts a real YYYY-MM-DD date', () => {
    expect(parseIsoDate('2026-10-05')).toBe('2026-10-05')
    expect(parseIsoDate('2028-02-29')).toBe('2028-02-29')
  })

  it('rejects anything malformed', () => {
    expect(parseIsoDate('')).toBeNull()
    expect(parseIsoDate('banana')).toBeNull()
    expect(parseIsoDate('2026-10-5')).toBeNull()
    expect(parseIsoDate('2026-10-05x')).toBeNull()
    expect(parseIsoDate('05-10-2026')).toBeNull()
  })

  it('rejects dates that do not exist', () => {
    expect(parseIsoDate('2026-02-30')).toBeNull()
    expect(parseIsoDate('2027-02-29')).toBeNull()
    expect(parseIsoDate('2026-13-01')).toBeNull()
    expect(parseIsoDate('2026-00-10')).toBeNull()
  })
})

describe('isoDateOf', () => {
  it('reads the local calendar date, not the UTC one', () => {
    expect(isoDateOf(new Date(2026, 8, 27, 23, 59))).toBe('2026-09-27')
    expect(isoDateOf(new Date(2026, 9, 5, 0, 1))).toBe('2026-10-05')
  })
})

describe('daysBetween', () => {
  it('counts the days from one date to another, across month and year ends', () => {
    expect(daysBetween('2026-10-08', '2026-10-09')).toBe(1)
    expect(daysBetween('2026-09-28', '2026-10-04')).toBe(6)
    expect(daysBetween('2026-12-28', '2027-01-04')).toBe(7)
  })

  it('is 0 for the same date, and negative going back', () => {
    expect(daysBetween('2026-10-07', '2026-10-07')).toBe(0)
    expect(daysBetween('2026-10-05', '2026-09-28')).toBe(-7)
  })

  it('ignores daylight saving, because dates have no time', () => {
    // Sydney clocks go forward on 4 Oct 2026
    expect(daysBetween('2026-10-03', '2026-10-05')).toBe(2)
  })
})

describe('addDays', () => {
  it('moves across month and year ends', () => {
    expect(addDays('2026-09-28', 6)).toBe('2026-10-04')
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04')
    expect(addDays('2026-10-05', -7)).toBe('2026-09-28')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('ignores daylight saving, because dates have no time', () => {
    // Sydney clocks go forward on 4 Oct 2026
    expect(addDays('2026-10-03', 1)).toBe('2026-10-04')
    expect(addDays('2026-10-04', 1)).toBe('2026-10-05')
  })
})

describe('weekdayIndex', () => {
  it('counts from Monday', () => {
    expect(weekdayIndex('2026-10-05')).toBe(0)
    expect(weekdayIndex('2026-10-08')).toBe(3)
    expect(weekdayIndex('2026-10-11')).toBe(6)
  })
})

describe('mondayOf', () => {
  it('returns the same day for a Monday', () => {
    expect(mondayOf('2026-10-05')).toBe('2026-10-05')
  })

  it('goes back to the Monday for any other day', () => {
    expect(mondayOf('2026-10-08')).toBe('2026-10-05')
    expect(mondayOf('2026-10-11')).toBe('2026-10-05')
    expect(mondayOf('2026-09-27')).toBe('2026-09-21')
    expect(mondayOf('2027-01-03')).toBe('2026-12-28')
  })
})

describe('isMonday', () => {
  it('accepts a real date that falls on a Monday', () => {
    expect(isMonday('2026-10-05')).toBe(true)
    expect(isMonday('2026-12-28')).toBe(true)
  })

  it('refuses any other day, and anything that is not a date', () => {
    expect(isMonday('2026-10-06')).toBe(false)
    expect(isMonday('2026-10-11')).toBe(false)
    expect(isMonday('2026-02-30')).toBe(false)
    expect(isMonday('banana')).toBe(false)
  })
})

describe('isInWeek', () => {
  it('includes Monday through Sunday', () => {
    expect(isInWeek('2026-09-28', '2026-09-28')).toBe(true)
    expect(isInWeek('2026-09-28', '2026-10-01')).toBe(true)
    expect(isInWeek('2026-09-28', '2026-10-04')).toBe(true)
  })

  it('excludes the days either side', () => {
    expect(isInWeek('2026-09-28', '2026-09-27')).toBe(false)
    expect(isInWeek('2026-09-28', '2026-10-05')).toBe(false)
  })

  it('excludes anything that is not a date', () => {
    expect(isInWeek('2026-09-28', '2026-9-29')).toBe(false)
    expect(isInWeek('2026-09-28', '')).toBe(false)
  })
})

describe('weekDates', () => {
  it('lists the seven dates from Monday to Sunday', () => {
    expect(weekDates('2026-09-28')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
  })
})

describe('canonicalWeek', () => {
  const today = () => '2026-09-27'

  it('keeps a Monday as it is', () => {
    expect(canonicalWeek('2026-10-05', today)).toBe('2026-10-05')
  })

  it('moves any other date to its Monday', () => {
    expect(canonicalWeek('2026-10-08', today)).toBe('2026-10-05')
  })

  it("falls back to the fallback's Monday for a malformed date", () => {
    expect(canonicalWeek('nonsense', today)).toBe('2026-09-21')
    expect(canonicalWeek('2026-02-30', today)).toBe('2026-09-21')
  })

  it('only works out the fallback when it needs it', () => {
    let asked = 0
    const fallback = () => (asked++, '2026-09-27')
    canonicalWeek('2026-10-08', fallback)
    expect(asked).toBe(0)
  })
})

describe('day labels', () => {
  it('names the weekday', () => {
    expect(dayName('2026-10-05')).toBe('Mon')
    expect(dayName('2026-10-11')).toBe('Sun')
  })

  it('gives the short date', () => {
    expect(shortDate('2026-10-05')).toBe('5 Oct')
    expect(shortDate('2026-12-25')).toBe('25 Dec')
  })

  it('combines both', () => {
    expect(dayLabel('2026-10-05')).toBe('Mon 5 Oct')
  })

  it('gives the date with its year', () => {
    expect(fullDate('2026-09-27')).toBe('27 Sep 2026')
    expect(fullDate('2027-01-04')).toBe('4 Jan 2027')
  })
})

describe('weekRange', () => {
  it('names the first and last day', () => {
    expect(weekRange('2026-10-05')).toBe('5 Oct – 11 Oct')
    expect(weekRange('2026-09-28')).toBe('28 Sep – 4 Oct')
  })
})

describe('weekTitle', () => {
  it('names the month once when the week sits inside it', () => {
    expect(weekTitle('2026-10-05')).toBe('5 – 11 October 2026')
  })

  it('names both months when the week crosses one', () => {
    expect(weekTitle('2026-09-28')).toBe('28 Sep – 4 Oct 2026')
  })

  it('names both years when the week crosses one', () => {
    expect(weekTitle('2026-12-28')).toBe('28 Dec 2026 – 3 Jan 2027')
  })
})
