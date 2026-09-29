import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CopyText } from '@/components/CopyText'
import { Card, PageHead } from '@/components/Page'
import { businessName, openWeek, rosterWeek } from '@/lib/db/queries'
import { canonicalWeek, weekTitle } from '@/lib/roster/dates'
import { rosterText } from '@/lib/roster/rosterText'

// Reads the database, which Next can't see, so render on every request
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ week: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const week = canonicalWeek((await params).week, openWeek)
  return { title: `Share roster, ${weekTitle(week)}` }
}

export default async function ShareRosterPage({ params }: Props) {
  const { week: param } = await params
  const week = canonicalWeek(param, openWeek)
  if (week !== param) redirect(`/share/${week}`)

  const { days, roster, publish: state } = rosterWeek(week)
  const name = businessName()
  // Once published, the text is the snapshot's, so edits since stay out of it until they're published too
  const text =
    state.status === 'published' && roster?.snapshot
      ? rosterText({ businessName: name, ...roster.snapshot })
      : rosterText({ businessName: name, weekStart: week, days })

  return (
    <div className="max-w-210">
      <PageHead title="Share roster">
        Plain text, sized for the group chat. Only people on shift appear: no N/A, no leave, no one sitting the
        week out. Until the week is published it ends with DRAFT, so a half-built week can&apos;t be taken for
        the real one.
      </PageHead>
      {state.status === 'published' && state.changed && (
        <p
          role="note"
          className="mb-4 rounded-card border border-warn-line bg-warn-bg px-3.5 py-2.5 text-[12.5px] text-warn-deep"
        >
          This is v{state.version} as published. The week has changed since, and the changes aren&apos;t in this
          text until you{' '}
          <Link href={`/roster/${week}`} className="text-link text-warn-deep">
            publish the update
          </Link>
          .
        </p>
      )}
      <Card title={weekTitle(week)}>
        <CopyText text={text} back={`/roster/${week}`} />
      </Card>
    </div>
  )
}
