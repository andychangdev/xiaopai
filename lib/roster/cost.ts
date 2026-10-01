// Money for the cost estimate. A rate is whole cents (2850 = $28.50), so
// adding them up never meets floating point.

export type Cents = number

export const MAX_HOURLY_RATE = 200
export const RATE_INVALID = `Hourly rate is an amount up to $${MAX_HOURLY_RATE}, like 28.50, or blank for none.`

/** Blank means no rate. Otherwise dollars, with cents to two places and a '$' if you like, above $0 and up to $200. */
export function parseHourlyRate(input: string): { ok: true; value: Cents | null } | { ok: false } {
  const s = input.trim()
  if (s === '') return { ok: true, value: null }
  const amount = /^\$?(\d+)(?:\.(\d{1,2}))?$/.exec(s)
  if (!amount) return { ok: false }
  // Whole cents from the digits, so 0.1 + 0.2 never comes into it
  const cents = Number(amount[1]) * 100 + Number((amount[2] ?? '').padEnd(2, '0'))
  return cents > 0 && cents <= MAX_HOURLY_RATE * 100 ? { ok: true, value: cents } : { ok: false }
}

/** '$28.50', for the Staff page's rate box. */
export function formatRate(rate: Cents): string {
  return `$${Math.floor(rate / 100)}.${String(rate % 100).padStart(2, '0')}`
}
