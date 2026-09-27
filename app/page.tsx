import { redirect } from 'next/navigation'
import { today } from '@/lib/clock'
import { mondayOf } from '@/lib/roster/dates'

// Reads the clock, so it must run on every request, never at build time
export const dynamic = 'force-dynamic'

// No homepage: the URL always names a week
export default function Home() {
  redirect(`/roster/${mondayOf(today())}`)
}
