import { redirect } from 'next/navigation'
import { openWeek } from '@/lib/db/queries'

// Reads the clock, so it must run on every request, never at build time
export const dynamic = 'force-dynamic'

// Share roster on its own, from a bookmark made when it was a tab, means the
// same week the Roster tab would open
export default function ShareRosterIndex() {
  redirect(`/share/${openWeek()}`)
}
