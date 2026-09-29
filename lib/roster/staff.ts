// Rules for the staff list: who gets a row on a week, the manual order, and
// what the Staff page accepts.

import { shiftsLabel } from './shifts'

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

/** The order after moving one person to place `to`, counting from 0; past either end is that end. */
export function moveInOrder<T extends { id: number }>(rows: T[], id: number, to: number): T[] {
  const person = rows.find((p) => p.id === id)
  if (!person) return [...rows]
  const out = rows.filter((p) => p !== person)
  out.splice(Math.min(Math.max(to, 0), out.length), 0, person)
  return out
}

/** How the grid and the chat address someone: 'John' for John Reyes. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0]
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
    shifts > 0 && shiftsLabel(shifts),
    leave > 0 && 'booked leave',
  ]
    .filter(Boolean)
    .join(' and ')
  const instead = person.active
    ? 'Untick Active instead: that takes them off new weeks'
    : 'Being inactive already keeps them off new weeks'
  return `${person.name} has ${has} on record. ${instead}, and removing the record would leave holes in past rosters.`
}
