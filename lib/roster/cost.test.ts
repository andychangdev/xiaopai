import { describe, expect, it } from 'vitest'
import { formatRate, parseHourlyRate } from './cost'

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
