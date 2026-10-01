// Loads starting data into an empty database: placeholder staff, the three
// shift templates and the trading hours. Refuses to touch a database that
// already has anything in it.
//
//   npm run db:migrate && npm run db:seed

import { count } from 'drizzle-orm'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'
import { openDb } from '../lib/db/open'
import * as t from '../lib/db/schema'
import { DEFAULT_TRADING_HOURS } from '../lib/roster/settings'
import { EVERY_DAY } from '../lib/roster/staff'

// Placeholders from the mockup. Rename them on the Staff page. Rates are cents.
const STAFF = [
  { name: 'John Reyes', expectedHours: 24, hourlyRate: 2850, available: [true, true, true, true, true, true, false] },
  { name: 'Priya Naidu', expectedHours: null, hourlyRate: 3100, available: EVERY_DAY },
  { name: 'Sarah Dunn', expectedHours: 24, hourlyRate: 2850, available: EVERY_DAY },
  { name: 'Lisa Chen', expectedHours: 20, hourlyRate: 2600, available: [true, true, true, true, true, true, false] },
  { name: 'Mike Tulloch', expectedHours: 18, hourlyRate: 2600, available: [false, false, true, true, true, true, true] },
  { name: 'Dana Okafor', expectedHours: null, hourlyRate: null, available: EVERY_DAY, active: false },
]

const TEMPLATES = [
  { name: 'Short day', start: 600, end: 960 }, // 10:00–16:00
  { name: 'Full day', start: 600, end: 1080 }, // 10:00–18:00
  { name: 'Shopping night', start: 600, end: 1260 }, // 10:00–21:00
]

const db = openDb()

function rowsIn(table: SQLiteTable): number {
  return db.select({ n: count() }).from(table).get()!.n
}

let existing: number
try {
  existing = [t.staff, t.shiftTemplates, t.tradingHours, t.rosters, t.shifts, t.naNotes, t.leave]
    .map(rowsIn)
    .reduce((a, b) => a + b, 0)
} catch (e) {
  if (e instanceof Error && e.message.includes('no such table')) {
    console.error('The database has no tables yet. Run `npm run db:migrate` first.')
    process.exit(1)
  }
  throw e
}

if (existing > 0) {
  console.error('The database already has data in it, so the seed left it alone.')
  process.exit(1)
}

db.transaction((tx) => {
  tx.insert(t.staff)
    .values(STAFF.map((s, i) => ({ ...s, sortOrder: i })))
    .run()
  tx.insert(t.shiftTemplates)
    .values(TEMPLATES.map((s, i) => ({ ...s, sortOrder: i })))
    .run()
  tx.insert(t.tradingHours)
    .values(DEFAULT_TRADING_HOURS.map((hours, weekday) => ({ weekday, ...hours })))
    .run()
})

console.log(`Seeded ${STAFF.length} staff, ${TEMPLATES.length} shift templates and trading hours.`)
