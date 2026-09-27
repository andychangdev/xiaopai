import { today } from '@/lib/clock'
import { everyTable } from '@/lib/db/queries'
import { backupFile } from '@/lib/roster/backup'

// Reads the database, which Next can't see, so run on every request
export const dynamic = 'force-dynamic'

/** Settings' Export backup: the whole database as a JSON file to download. It only reads. */
export function GET() {
  const { name, json } = backupFile(everyTable(), today())
  return new Response(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  })
}
