import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

// Relative to the working directory, which is the project folder for every
// npm script and for the Dock launcher
export const DB_FILE = 'xiaopai.db'

export function openDb(file = DB_FILE) {
  const sqlite = new Database(file)
  sqlite.pragma('foreign_keys = ON')
  return drizzle(sqlite, { schema, casing: 'snake_case' })
}

export type Db = ReturnType<typeof openDb>
