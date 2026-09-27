import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { HistoryTable } from '@/components/HistoryTable'
import { Card, PageHead } from '@/components/Page'
import { history, openWeek } from '@/lib/db/queries'
import { canonicalWeek, weekTitle } from '@/lib/roster/dates'

// Reads the database, which Next can't see, so render on every request
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'History' }

type Props = { searchParams: Promise<{ week?: string | string[] }> }

/**
 * `?week=` names the week you have open, as History is a page of its own and
 * the tab bar carries it here. Without one, it's the week the Roster tab
 * would open.
 */
export default async function HistoryPage({ searchParams }: Props) {
  const { week: param } = await searchParams
  const week = canonicalWeek(typeof param === 'string' ? param : '', openWeek)
  if (week !== param) redirect(`/history?week=${week}`)

  return (
    <div className="max-w-[840px]">
      <PageHead title="History">
        Every week that has shifts or has been published, newest first. Open one to look at it, or copy it over
        the week you have open,{' '}
        <Link href={`/roster/${week}`} className="text-link">
          {weekTitle(week)}
        </Link>
        . Published weeks keep the names and times they went out with, so changing the staff list never rewrites
        a roster people already worked.
      </PageHead>
      <Card title="Weeks">
        <HistoryTable rows={history(week)} />
      </Card>
    </div>
  )
}
