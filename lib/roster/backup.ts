// The JSON export: everything in the database as one file, to read and keep.
// Copying xiaopai.db stays the real backup (ARCHITECTURE §8b). Nothing reads
// this file back in, so it's laid out for a person rather than for the app.

import type { IsoDate } from './dates'

const ABOUT =
  "Everything in xiaopai, one list of rows per table. Times are minutes since midnight (600 is 10:00), an hourly rate is cents (2850 is $28.50), dates are YYYY-MM-DD, and a list of seven true/false flags runs Monday to Sunday. It's for reading and keeping, and can't be imported: the real backup is a copy of xiaopai.db."

/** The file Export backup downloads, named with the date it was made. */
export function backupFile(tables: Record<string, unknown[]>, today: IsoDate): { name: string; json: string } {
  return {
    name: `xiaopai-${today}.json`,
    // Through JSON first, so a value with its own toJSON, like a Date, reads as JSON.stringify would write it
    json: readable(JSON.parse(JSON.stringify({ exported: today, about: ABOUT, tables }))) + '\n',
  }
}

/**
 * JSON one field to a line, like JSON.stringify's indent, except that a list
 * of plain values stays on one: `[true, true, false, …]` rather than seven
 * lines of flags.
 */
function readable(value: unknown, indent = ''): string {
  const inner = indent + '  '
  if (Array.isArray(value)) {
    if (value.every((v) => v === null || typeof v !== 'object')) {
      return `[${value.map((v) => JSON.stringify(v)).join(', ')}]`
    }
    return `[\n${value.map((v) => inner + readable(v, inner)).join(',\n')}\n${indent}]`
  }
  if (value !== null && typeof value === 'object') {
    const fields = Object.entries(value)
    if (!fields.length) return '{}'
    return `{\n${fields.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${readable(v, inner)}`).join(',\n')}\n${indent}}`
  }
  return JSON.stringify(value)
}
