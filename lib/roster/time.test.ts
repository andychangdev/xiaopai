import { describe, expect, it } from 'vitest'
import { END_AFTER_START, NOT_A_RANGE, PAST_MIDNIGHT, formatRange, formatTime, parseTimeRange, timesError } from './time'

describe('formatTime', () => {
  it('shows minutes since midnight as 24-hour HH:MM', () => {
    expect(formatTime(600)).toBe('10:00')
    expect(formatTime(1260)).toBe('21:00')
    expect(formatTime(570)).toBe('09:30')
    expect(formatTime(0)).toBe('00:00')
  })

  it('shows midnight at the end of the day as 24:00', () => {
    expect(formatTime(1440)).toBe('24:00')
  })
})

describe('formatRange', () => {
  it('joins the two times with an en dash', () => {
    expect(formatRange(600, 1080)).toBe('10:00–18:00')
  })
})

describe('timesError', () => {
  it('accepts a shift that ends after it starts, within the day', () => {
    expect(timesError(600, 1080)).toBeNull()
    expect(timesError(0, 1440)).toBeNull()
  })

  it('refuses an end at or before the start', () => {
    expect(timesError(1080, 600)).toBe(END_AFTER_START)
    expect(timesError(600, 600)).toBe(END_AFTER_START)
  })

  it('refuses a shift ending after midnight', () => {
    expect(timesError(600, 1441)).toBe(PAST_MIDNIGHT)
  })

  it('refuses anything that is not a whole minute of the day', () => {
    expect(timesError(-60, 600)).toBe(NOT_A_RANGE)
    expect(timesError(600.5, 1080)).toBe(NOT_A_RANGE)
    expect(timesError(Number.NaN, 1080)).toBe(NOT_A_RANGE)
    expect(timesError('600' as unknown as number, 1080)).toBe(NOT_A_RANGE)
  })
})

describe('parseTimeRange', () => {
  it('reads whole hours', () => {
    expect(parseTimeRange('10-18')).toEqual({ start: 600, end: 1080 })
  })

  it('reads hours and minutes', () => {
    expect(parseTimeRange('10:00-18:00')).toEqual({ start: 600, end: 1080 })
    expect(parseTimeRange('10:30-16:15')).toEqual({ start: 630, end: 975 })
    expect(parseTimeRange('9:30-13')).toEqual({ start: 570, end: 780 })
  })

  it('allows spaces around the times', () => {
    expect(parseTimeRange('  10 - 18 ')).toEqual({ start: 600, end: 1080 })
  })

  it('takes the times literally, as 24-hour', () => {
    expect(parseTimeRange('7-12')).toEqual({ start: 420, end: 720 })
    expect(parseTimeRange('17-21')).toEqual({ start: 1020, end: 1260 })
  })

  it('accepts a shift ending at midnight', () => {
    expect(parseTimeRange('18-24')).toEqual({ start: 1080, end: 1440 })
  })

  it('refuses an end at or before the start, since overnight shifts are not supported', () => {
    expect(parseTimeRange('18-10')).toEqual({ error: END_AFTER_START })
    expect(parseTimeRange('10-10')).toEqual({ error: END_AFTER_START })
  })

  it('refuses a shift ending after midnight', () => {
    expect(parseTimeRange('18-24:30')).toEqual({ error: PAST_MIDNIGHT })
  })

  it('refuses anything that does not read as a range', () => {
    for (const bad of ['', '   ', '10', '10-', '-18', 'ten-six', '10:5-18', '10:60-18', '10-18-20', '18-25', '100-180', '10.5-18']) {
      expect(parseTimeRange(bad), bad).toEqual({ error: NOT_A_RANGE })
    }
  })
})
