import { describe, expect, it } from 'vitest'
import { DEFAULT_TRADING_HOURS, tradingHoursError, tradingSummary, tradingWeek, type TradingDay } from './settings'

const day = (open: number, close: number): TradingDay => ({ open, close })
const everyDay = (open: number, close: number) => Array.from({ length: 7 }, () => day(open, close))

describe('DEFAULT_TRADING_HOURS', () => {
  it('is 10:00–18:00, and to 21:00 on Thursday for shopping night', () => {
    expect(DEFAULT_TRADING_HOURS).toEqual([
      day(600, 1080),
      day(600, 1080),
      day(600, 1080),
      day(600, 1260),
      day(600, 1080),
      day(600, 1080),
      day(600, 1080),
    ])
  })
})

describe('tradingWeek', () => {
  it('lays the stored days out Monday first, whatever order they arrive in', () => {
    const rows = [6, 5, 4, 3, 2, 1, 0].map((weekday) => ({ weekday, open: 540 + weekday * 30, close: 1080 }))
    expect(tradingWeek(rows).map((d) => d.open)).toEqual([540, 570, 600, 630, 660, 690, 720])
  })

  it('fills any day with nothing stored from the defaults', () => {
    const week = tradingWeek([{ weekday: 6, open: 720, close: 1020 }])
    expect(week.slice(0, 6)).toEqual(DEFAULT_TRADING_HOURS.slice(0, 6))
    expect(week[6]).toEqual(day(720, 1020))
  })

  it('is all defaults on a database with no trading hours yet', () => {
    expect(tradingWeek([])).toEqual(DEFAULT_TRADING_HOURS)
  })

  it('hands back its own copy of a default, so changing it leaves the defaults alone', () => {
    tradingWeek([])[0].open = 0
    expect(DEFAULT_TRADING_HOURS[0].open).toBe(600)
  })
})

describe('tradingSummary', () => {
  it("reads like the mockup's footer for the usual week", () => {
    expect(tradingSummary(DEFAULT_TRADING_HOURS)).toBe('Open 10:00–18:00 · 21:00 Thu')
  })

  it('is one range when every day is the same', () => {
    expect(tradingSummary(everyDay(600, 1080))).toBe('Open 10:00–18:00')
  })

  it('shows the whole range for a day that closes early, so its closing time is not read as opening', () => {
    const week = everyDay(600, 1080)
    week[5] = day(600, 960)
    expect(tradingSummary(week)).toBe('Open 10:00–18:00 · 10:00–16:00 Sat')
  })

  it('shows the whole range for a day that opens at a different time', () => {
    const week = everyDay(600, 1080)
    week[6] = day(720, 1080)
    expect(tradingSummary(week)).toBe('Open 10:00–18:00 · 12:00–18:00 Sun')
  })

  it('names days with the same odd hours together, and lists the rest in weekday order', () => {
    const week = everyDay(600, 1080)
    week[5] = day(540, 1020)
    week[3] = day(600, 1260)
    week[4] = day(600, 1260)
    expect(tradingSummary(week)).toBe('Open 10:00–18:00 · 21:00 Thu, Fri · 09:00–17:00 Sat')
  })

  it("leads with the most common hours, not Monday's", () => {
    const week = everyDay(600, 1080)
    week[0] = day(660, 1080)
    expect(tradingSummary(week)).toBe('Open 10:00–18:00 · 11:00–18:00 Mon')
  })

  it('breaks a tie for most common with the earlier weekday, so the line never flips', () => {
    const week = [day(600, 1080), day(600, 1080), day(600, 1080), day(600, 1260), day(600, 1260), day(600, 1260), day(720, 1080)]
    expect(tradingSummary(week)).toBe('Open 10:00–18:00 · 21:00 Thu, Fri, Sat · 12:00–18:00 Sun')
  })
})

describe('tradingHoursError', () => {
  it('accepts a day that closes after it opens', () => {
    expect(tradingHoursError(600, 1080)).toBeNull()
    expect(tradingHoursError(600, 1440)).toBeNull()
  })

  it('refuses closing at or before opening', () => {
    expect(tradingHoursError(1080, 600)).toMatch(/close after it opens/)
    expect(tradingHoursError(600, 600)).toMatch(/close after it opens/)
  })

  it('refuses closing after midnight', () => {
    expect(tradingHoursError(600, 1470)).toMatch(/by midnight/)
  })

  it('refuses anything that is not a time of day', () => {
    expect(tradingHoursError(Number.NaN, 1080)).not.toBeNull()
    expect(tradingHoursError(600.5, 1080)).not.toBeNull()
    expect(tradingHoursError(-30, 1080)).not.toBeNull()
  })
})
