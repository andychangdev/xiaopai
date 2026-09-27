import { redirect } from 'next/navigation'
import { openWeek } from '@/lib/db/queries'

// Reads the clock, so it must run on every request, never at build time
export const dynamic = 'force-dynamic'

// Roster text on its own means the same week the Roster tab would open
export default function RosterTextIndex() {
  redirect(`/share/${openWeek()}`)
}
