import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'
import { ALL_OPEN } from '@/lib/roster/closed'
import type { Snapshot } from '@/lib/roster/types'

// Times are minutes since midnight (600 = 10:00). Dates are 'YYYY-MM-DD'.
// Weekday arrays are seven entries, Monday first. Column names are the
// snake_case of the keys (`casing` in open.ts and drizzle.config.ts).

export const staff = sqliteTable('staff', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  active: integer({ mode: 'boolean' }).notNull().default(true),
  available: text({ mode: 'json' }).$type<boolean[]>().notNull(),
  sortOrder: integer().notNull(),
  expectedHours: integer(),
  notes: text(),
})

export const shiftTemplates = sqliteTable('shift_templates', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  start: integer().notNull(),
  end: integer().notNull(),
  sortOrder: integer().notNull(),
})

// The business itself: one row, id 1
export const settings = sqliteTable('settings', {
  id: integer().primaryKey(),
  businessName: text().notNull(),
})

export const tradingHours = sqliteTable('trading_hours', {
  weekday: integer().primaryKey(), // 0 = Mon
  open: integer().notNull(),
  close: integer().notNull(),
})

export const rosters = sqliteTable('rosters', {
  weekStart: text().primaryKey(), // the Monday
  status: text({ enum: ['draft', 'published'] }).notNull().default('draft'),
  version: integer().notNull().default(0),
  publishedAt: text(),
  closedDays: text({ mode: 'json' }).$type<boolean[]>().notNull().default(ALL_OPEN), // owned by the week
  snapshot: text({ mode: 'json' }).$type<Snapshot>(),
})

export const shifts = sqliteTable(
  'shifts',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    weekStart: text().notNull().references(() => rosters.weekStart),
    staffId: integer().notNull().references(() => staff.id),
    date: text().notNull(),
    start: integer().notNull(),
    end: integer().notNull(),
  },
  (t) => [index('shifts_week_start_idx').on(t.weekStart)],
)

// "Can't do Friday this week": a note on one cell of one week
export const naNotes = sqliteTable(
  'na_notes',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    weekStart: text().notNull().references(() => rosters.weekStart),
    staffId: integer().notNull().references(() => staff.id),
    date: text().notNull(),
  },
  (t) => [unique('na_notes_cell_unique').on(t.weekStart, t.staffId, t.date)],
)

export const leave = sqliteTable('leave', {
  id: integer().primaryKey({ autoIncrement: true }),
  staffId: integer().notNull().references(() => staff.id),
  fromDate: text().notNull(),
  toDate: text().notNull(),
  note: text(),
})
