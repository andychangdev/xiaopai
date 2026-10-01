import { describe, expect, it } from 'vitest'
import {
  costFor,
  formatDollars,
  formatRate,
  holidayDate,
  noRateNote,
  parseHoliday,
  parseHourlyRate,
  parsePayRate,
  rateOn,
  rosteredWithoutRate,
  weekCost,
  type PayRates,
} from './cost'

// The week of Mon 5 Oct 2026: Sat is the 10th, Sun the 11th
const MON = '2026-10-05'
const SAT = '2026-10-10'
const SUN = '2026-10-11'

const shift = (staffId: number, start: number, end: number, date = MON) => ({ staffId, date, start, end })

const h = (hours: number) => hours * 60

const person = (id: number, name: string, hourlyRate: number | null) => ({ id, name, hourlyRate })

const FLAT: PayRates = { weekend: 100, holiday: 100, holidays: [] }

const rates = (over: Partial<PayRates>): PayRates => ({ ...FLAT, ...over })

describe('parseHourlyRate', () => {
  it('treats blank as no rate', () => {
    expect(parseHourlyRate('')).toEqual({ ok: true, value: null })
    expect(parseHourlyRate('  ')).toEqual({ ok: true, value: null })
  })

  it('reads dollars and cents as whole cents', () => {
    expect(parseHourlyRate('28.50')).toEqual({ ok: true, value: 2850 })
    expect(parseHourlyRate('28.5')).toEqual({ ok: true, value: 2850 })
    expect(parseHourlyRate('28')).toEqual({ ok: true, value: 2800 })
    expect(parseHourlyRate(' 31.05 ')).toEqual({ ok: true, value: 3105 })
  })

  it("takes a '$' in front", () => {
    expect(parseHourlyRate('$28.50')).toEqual({ ok: true, value: 2850 })
  })

  // 0.29 × 100 is 28.999999999999996 in floating point
  it('gets cents exactly right where multiplying by 100 would not', () => {
    expect(parseHourlyRate('0.29')).toEqual({ ok: true, value: 29 })
    expect(parseHourlyRate('19.99')).toEqual({ ok: true, value: 1999 })
  })

  it('accepts anything above $0 up to $200', () => {
    expect(parseHourlyRate('0.01')).toEqual({ ok: true, value: 1 })
    expect(parseHourlyRate('200')).toEqual({ ok: true, value: 20000 })
  })

  it('refuses anything else', () => {
    for (const bad of ['0', '0.00', '200.01', '-28', '28.505', '28.', '.50', '$', '28/h', 'twenty', '1e2', '2,850']) {
      expect(parseHourlyRate(bad), bad).toEqual({ ok: false })
    }
  })
})

describe('formatRate', () => {
  it('shows dollars and two places of cents', () => {
    expect(formatRate(2850)).toBe('$28.50')
    expect(formatRate(3105)).toBe('$31.05')
    expect(formatRate(2800)).toBe('$28.00')
    expect(formatRate(1)).toBe('$0.01')
  })
})

describe('formatDollars', () => {
  it('groups thousands', () => {
    expect(formatDollars(0)).toBe('$0')
    expect(formatDollars(684)).toBe('$684')
    expect(formatDollars(2940)).toBe('$2,940')
    expect(formatDollars(1234567)).toBe('$1,234,567')
  })
})

describe('parsePayRate', () => {
  it('reads a whole percentage, with or without the sign', () => {
    expect(parsePayRate('125')).toBe(125)
    expect(parsePayRate(' 225% ')).toBe(225)
  })

  it('treats blank as 100, the usual rate', () => {
    expect(parsePayRate('')).toBe(100)
  })

  it('accepts 100 to 500', () => {
    expect(parsePayRate('100')).toBe(100)
    expect(parsePayRate('500')).toBe(500)
  })

  it('refuses anything else', () => {
    for (const bad of ['99', '501', '0', '-125', '125.5', '1.25', '%', 'double', '125 %']) {
      expect(parsePayRate(bad), bad).toBeNull()
    }
  })
})

describe('parseHoliday', () => {
  it('takes a date and an optional name', () => {
    expect(parseHoliday({ date: MON, name: ' Labour Day ' })).toEqual({ date: MON, name: 'Labour Day' })
    expect(parseHoliday({ date: MON, name: '  ' })).toEqual({ date: MON, name: null })
  })

  it('needs a real date', () => {
    expect(parseHoliday({ date: '', name: 'Labour Day' })).toHaveProperty('error')
    expect(parseHoliday({ date: '2026-02-30', name: '' })).toHaveProperty('error')
  })
})

describe('holidayDate', () => {
  it('gives the year, since the list runs across years', () => {
    expect(holidayDate('2026-12-25')).toBe('Fri 25 Dec 2026')
  })
})

describe('rateOn', () => {
  const set = rates({ weekend: 125, holiday: 225, holidays: [{ date: '2026-10-07', name: null }] })

  it("is the person's own rate on a weekday", () => {
    expect(rateOn(MON, set)).toBe(100)
  })

  it('is the weekend rate on Saturday and Sunday', () => {
    expect(rateOn(SAT, set)).toBe(125)
    expect(rateOn(SUN, set)).toBe(125)
  })

  it('is the holiday rate on a public holiday', () => {
    expect(rateOn('2026-10-07', set)).toBe(225)
  })

  it('is the higher of the two on a public holiday at the weekend', () => {
    expect(rateOn(SUN, rates({ weekend: 150, holiday: 225, holidays: [{ date: SUN, name: null }] }))).toBe(225)
    expect(rateOn(SUN, rates({ weekend: 150, holiday: 100, holidays: [{ date: SUN, name: null }] }))).toBe(150)
  })
})

describe('costFor', () => {
  it("is the hours at the person's rate, in dollars", () => {
    const threeDays = [shift(7, 600, 1080), shift(7, 600, 1080, '2026-10-06'), shift(7, 600, 1080, '2026-10-07')]
    expect(costFor(7, threeDays, 2850, FLAT)).toBe(684)
    expect(costFor(7, [shift(7, 600, 1050)], 3000, FLAT)).toBe(225)
  })

  it("leaves out everyone else's shifts", () => {
    expect(costFor(7, [shift(7, 600, 1080), shift(8, 600, 1080)], 3000, FLAT)).toBe(240)
  })

  it('raises weekend hours by the weekend rate', () => {
    // 8h Mon at $30 = $240, 8h Sat at 125% = $300
    expect(costFor(7, [shift(7, 600, 1080), shift(7, 600, 1080, SAT)], 3000, rates({ weekend: 125 }))).toBe(540)
  })

  it('raises public holiday hours by the holiday rate', () => {
    const labourDay = rates({ holiday: 225, holidays: [{ date: MON, name: 'Labour Day' }] })
    // 8h at $30 × 225% = $540
    expect(costFor(7, [shift(7, 600, 1080)], 3000, labourDay)).toBe(540)
  })

  it('costs each day at its own rate', () => {
    const shifts = [shift(1, 600, 1080), shift(1, 600, 1080, SAT), shift(1, 600, 1080, '2026-10-07')]
    const set = rates({ weekend: 150, holiday: 250, holidays: [{ date: '2026-10-07', name: null }] })
    // 8h × $20 at 100%, 150% and 250% = $160 + $240 + $400
    expect(costFor(1, shifts, 2000, set)).toBe(800)
  })

  it('rounds the week to the nearest dollar, a half up', () => {
    expect(costFor(7, [shift(7, 600, 660)], 2849, FLAT)).toBe(28)
    expect(costFor(7, [shift(7, 600, 660)], 2850, FLAT)).toBe(29)
    expect(costFor(7, [shift(7, 600, 630)], 2850, FLAT)).toBe(14) // $14.25
  })

  it('is nothing for no hours, with a rate', () => {
    expect(costFor(7, [], 2850, FLAT)).toBe(0)
  })

  it('is null for someone with no rate', () => {
    expect(costFor(7, [shift(7, 600, 1080)], null, FLAT)).toBeNull()
    expect(costFor(7, [], null, FLAT)).toBeNull()
  })
})

describe('weekCost', () => {
  it("adds up each person's cost", () => {
    const staff = [person(1, 'John Reyes', 2850), person(2, 'Lisa Chen', 3000)]
    const shifts = [shift(1, 600, 1080), shift(1, 600, 1260, '2026-10-08'), shift(2, 600, 960)]
    // John 19h × $28.50 = $541.50 → $542, Lisa 6h × $30 = $180
    expect(weekCost(staff, shifts, FLAT)).toBe(722)
  })

  it('totals the rounded lines, so it always matches them', () => {
    // Each is $14.25 → $14, though together they come to $42.75
    const staff = [person(1, 'A', 2850), person(2, 'B', 2850), person(3, 'C', 2850)]
    const shifts = [shift(1, 600, 630), shift(2, 600, 630), shift(3, 600, 630)]
    expect(weekCost(staff, shifts, FLAT)).toBe(42)
  })

  it('costs weekends and holidays at their rates', () => {
    const staff = [person(1, 'John Reyes', 2000), person(2, 'Lisa Chen', 2000)]
    const shifts = [shift(1, 600, 1080, SAT), shift(2, 600, 1080, '2026-10-07')]
    const set = rates({ weekend: 150, holiday: 250, holidays: [{ date: '2026-10-07', name: null }] })
    // 8h × $20 at 150% and 250% = $240 + $400
    expect(weekCost(staff, shifts, set)).toBe(640)
  })

  it('leaves out anyone with no rate', () => {
    const staff = [person(1, 'John Reyes', 2850), person(2, 'Priya Naidu', null)]
    expect(weekCost(staff, [shift(1, 600, 1080), shift(2, 600, 1080)], FLAT)).toBe(228)
  })

  it('is nothing for an empty week', () => {
    expect(weekCost([person(1, 'John Reyes', 2850)], [], FLAT)).toBe(0)
  })
})

describe('rosteredWithoutRate', () => {
  it('names anyone on the week with no rate', () => {
    const priya = person(2, 'Priya Naidu', null)
    const staff = [person(1, 'John Reyes', 2850), priya]
    expect(rosteredWithoutRate(staff, [shift(1, 600, 1080), shift(2, 600, 1080)])).toEqual([priya])
  })

  it("leaves out someone with no rate who isn't on this week", () => {
    const staff = [person(1, 'John Reyes', 2850), person(2, 'Priya Naidu', null)]
    expect(rosteredWithoutRate(staff, [shift(1, 600, 1080)])).toEqual([])
  })
})

describe('noRateNote', () => {
  it('is nothing when everyone has a rate', () => {
    expect(noRateNote([])).toBeNull()
  })

  it('names who the total leaves out, by first name', () => {
    expect(noRateNote([{ name: 'Priya Naidu' }])).toBe("Priya has no hourly rate, so isn't in the total")
    expect(noRateNote([{ name: 'Priya Naidu' }, { name: 'Dana Okafor' }])).toBe(
      "Priya and Dana have no hourly rate, so aren't in the total",
    )
    expect(noRateNote([{ name: 'Priya' }, { name: 'Dana' }, { name: 'Mike' }])).toBe(
      "Priya, Dana and Mike have no hourly rate, so aren't in the total",
    )
  })
})
