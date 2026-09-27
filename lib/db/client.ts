import 'server-only'
import { existsSync } from 'node:fs'
import { DB_FILE, openDb, type Db } from './open'

// Kept on globalThis because hot reload re-runs this module on every save,
// and each fresh connection would leave the file locked by the old ones.
const cached = globalThis as unknown as { xiaopaiDb?: Db }

/**
 * The app's connection, opened on first use so `next build` never touches
 * the file. Refuses to create one: a missing file means migrations haven't
 * run, or the server started in the wrong folder.
 */
export function getDb(): Db {
  if (!cached.xiaopaiDb) {
    if (!existsSync(DB_FILE)) {
      throw new Error(`No ${DB_FILE} in ${process.cwd()}. Run \`npm run db:migrate\` to create it.`)
    }
    cached.xiaopaiDb = openDb()
  }
  return cached.xiaopaiDb
}
