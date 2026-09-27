import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { getDb } from './client'
import { staff } from './schema'

/** The roster's rows: everyone active, in the order set on the Staff page. */
export function activeStaff() {
  return getDb()
    .select({ id: staff.id, name: staff.name })
    .from(staff)
    .where(eq(staff.active, true))
    .orderBy(asc(staff.sortOrder), asc(staff.id))
    .all()
}
