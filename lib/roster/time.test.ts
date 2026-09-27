import { describe, expect, it } from 'vitest'
import { END_AFTER_START, NOT_A_RANGE, PAST_MIDNIGHT, formatRange, formatTime, parseShorthand, timesError } from './time'

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

describe('parseShorthand', () => {
  it('reads whole hours', () => {
    expect(parseShorthand('10-18')).toEqual({ start: 600, end: 1080 })
  })

  it('reads hours and minutes', () => {
    expect(parseShorthand('10:00-18:00')).toEqual({ start: 600, end: 1080 })
    expect(parseShorthand('10:30-16:15')).toEqual({ start: 630, end: 975 })
    expect(parseShorthand('9:30-13')).toEqual({ start: 570, end: 780 })
  })

  it('takes a range from 7:00 that already runs forwards literally, as 24-hour', () => {
    expect(parseShorthand('10:30-16:00')).toEqual({ start: 630, end: 960 })
    expect(parseShorthand('7-12')).toEqual({ start: 420, end: 720 })
    expect(parseShorthand('17-21')).toEqual({ start: 1020, end: 1260 })
  })

  it('accepts -, – or to between the times, with or without spaces', () => {
    for (const range of ['10 - 18', '10–18', '10 – 18', '10to18', '10 to 18', '10 TO 18', '  10 - 18 ']) {
      expect(parseShorthand(range), range).toEqual({ start: 600, end: 1080 })
    }
  })

  it('reads a start hour below 7 as the afternoon, even in a range that runs forwards', () => {
    expect(parseShorthand('5-9')).toEqual({ start: 1020, end: 1260 })
    expect(parseShorthand('6:30-10')).toEqual({ start: 1110, end: 1320 })
    expect(parseShorthand('6-12')).toEqual({ start: 1080, end: 1440 })
    expect(parseShorthand('1-17')).toEqual({ start: 780, end: 1020 })
  })

  it('moves an end at or before the start forward 12 hours until it is after the start', () => {
    expect(parseShorthand('10-6')).toEqual({ start: 600, end: 1080 })
    expect(parseShorthand('10-9')).toEqual({ start: 600, end: 1260 })
    expect(parseShorthand('12-6')).toEqual({ start: 720, end: 1080 })
    expect(parseShorthand('10:30-4')).toEqual({ start: 630, end: 960 })
    expect(parseShorthand('10-10')).toEqual({ start: 600, end: 1320 })
    expect(parseShorthand('18-10')).toEqual({ start: 1080, end: 1320 })
  })

  it('accepts a shift ending at midnight', () => {
    expect(parseShorthand('18-24')).toEqual({ start: 1080, end: 1440 })
    expect(parseShorthand('18-12')).toEqual({ start: 1080, end: 1440 })
  })

  it('refuses a shift that would end after midnight', () => {
    expect(parseShorthand('18-24:30')).toEqual({ error: PAST_MIDNIGHT })
    expect(parseShorthand('20-1')).toEqual({ error: PAST_MIDNIGHT })
    expect(parseShorthand('18-6')).toEqual({ error: PAST_MIDNIGHT })
    expect(parseShorthand('6-14')).toEqual({ error: PAST_MIDNIGHT })
  })

  it('refuses anything that does not read as a range', () => {
    const bad = ['', '   ', '10', '10-', '-18', 'ten-six', '10:5-18', '10:60-18', '10-18-20', '18-25', '100-180', '10.5-18']
    for (const range of [...bad, '10--18', '10-to-18', '10 t 18', '10 o 18', '10—18', '10 until 18']) {
      expect(parseShorthand(range), range).toEqual({ error: NOT_A_RANGE })
    }
  })
})
