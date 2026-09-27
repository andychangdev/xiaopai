import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CopyText } from '@/components/CopyText'
import { Card, PageHead } from '@/components/Page'
import { today } from '@/lib/clock'
import { rosterWeek } from '@/lib/db/queries'
import { canonicalWeek, weekTitle } from '@/lib/roster/dates'
import { rosterDays, rosterText } from '@/lib/roster/rosterText'

// Reads the database, which Next can't see, so render on every request
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ week: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const week = canonicalWeek((await params).week, today())
  return { title: `Roster text, ${weekTitle(week)}` }
}

export default async function RosterTextPage({ params }: Props) {
  const { week: param } = await params
  const week = canonicalWeek(param, today())
  if (week !== param) redirect(`/share/${week}`)

  const { staff, shifts, closedDays } = rosterWeek(week)
  const days = rosterDays({ weekStart: week, staff, shifts, closedDays })

  return (
    <div className="max-w-[840px]">
      <PageHead title="Roster text">
        Plain text, sized for the group chat. Only people on shift appear: no N/A, no leave, no one sitting the
        week out. Until the week is published it ends with DRAFT, so a half-built week can&apos;t be taken for
        the real one.
      </PageHead>
      <Card title={weekTitle(week)}>
        <CopyText text={rosterText({ weekStart: week, days })} back={`/roster/${week}`} />
      </Card>
    </div>
  )
}
