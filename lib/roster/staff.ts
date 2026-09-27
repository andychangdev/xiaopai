// Rules for the staff list: who gets a row on a week, the manual order, and
// what the Staff page accepts.

type Ordered = { id: number; sortOrder: number }

const bySetOrder = (a: Ordered, b: Ordered) => a.sortOrder - b.sortOrder || a.id - b.id

/**
 * The rows on a week's grid: everyone active, plus anyone since made inactive
 * who has shifts that week, so a past week never loses a row.
 */
export function rosterRows<T extends Ordered & { active: boolean }>(
  staff: T[],
  weekShifts: { staffId: number }[],
): T[] {
  const rostered = new Set(weekShifts.map((s) => s.staffId))
  return staff.filter((p) => p.active || rostered.has(p.id)).sort(bySetOrder)
}

/** The order after moving one person a place up (-1) or down (1). */
export function moveInOrder(ids: number[], id: number, dir: -1 | 1): number[] {
  const out = [...ids]
  const i = out.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= out.length) return out
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

/** Where a new person starts: available every day of the week. */
export const EVERY_DAY = [true, true, true, true, true, true, true]

export const NAME_REQUIRED = "A name can't be blank."

export function parseName(input: string): string | null {
  return input.trim() || null
}

export function parseNotes(input: string): string | null {
  return input.trim() || null
}

export const MAX_EXPECTED_HOURS = 80
export const HOURS_INVALID = `Expected hours is a whole number from 1 to ${MAX_EXPECTED_HOURS}, or blank for none.`

/** Blank means no expected hours. Otherwise a whole number of hours, 1–80. */
export function parseExpectedHours(input: string): { ok: true; value: number | null } | { ok: false } {
  const s = input.trim()
  if (s === '') return { ok: true, value: null }
  if (!/^\d+$/.test(s)) return { ok: false }
  const n = Number(s)
  return n >= 1 && n <= MAX_EXPECTED_HOURS ? { ok: true, value: n } : { ok: false }
}

/**
 * Only a record with no history can be removed (a typo). For anyone else,
 * the reason to show instead; null when removing is fine.
 */
export function whyNotRemovable(
  person: { name: string; active: boolean },
  history: { shifts: number; leave: number },
): string | null {
  const { shifts, leave } = history
  if (shifts === 0 && leave === 0) return null
  const has = [
    shifts > 0 && `${shifts} shift${shifts === 1 ? '' : 's'}`,
    leave > 0 && 'booked leave',
  ]
    .filter(Boolean)
    .join(' and ')
  const instead = person.active
    ? 'Untick Active instead: that takes them off new weeks'
    : 'Being inactive already keeps them off new weeks'
  return `${person.name} has ${has} on record. ${instead}, and removing the record would leave holes in past rosters.`
}
