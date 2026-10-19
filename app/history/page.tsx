import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { HistoryTable } from '@/components/HistoryTable'
import { Card, PageHead } from '@/components/Page'
import { history, openWeek } from '@/lib/db/queries'
import { canonicalWeek } from '@/lib/roster/dates'

// Reads the database, which Next can't see, so render on every request
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'History' }

type Props = { searchParams: Promise<{ week?: string | string[] }> }

/**
 * `?week=` names the week you have open, as History is a page of its own and
 * the sidebar carries it here. Without one, it's the week Roster would
 * open.
 */
export default async function HistoryPage({ searchParams }: Props) {
  const { week: param } = await searchParams
  const week = canonicalWeek(typeof param === 'string' ? param : '', openWeek)
  if (week !== param) redirect(`/history?week=${week}`)

  return (
    <div className="max-w-210">
      <PageHead title="History" />
      <Card title="Weeks">
        <HistoryTable rows={history(week)} />
      </Card>
    </div>
  )
}
