import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageHead } from '@/components/Page'
import { RosterGrid } from '@/components/RosterGrid'
import { WeekPicker } from '@/components/WeekPicker'
import { today } from '@/lib/clock'
import {
  hasStaff,
  openWeek,
  payRatesFor,
  rosterWeek,
  shiftCount,
  templateList,
  tradingHoursWeek,
  weekStates,
} from '@/lib/db/queries'
import { undoLabel } from '@/lib/db/undo'
import { addDays, canonicalWeek, mondayOf, weekTitle } from '@/lib/roster/dates'
import { unpublishedShifts, weekSubtitle } from '@/lib/roster/publish'
import { tradingSummary } from '@/lib/roster/settings'
import { menuWeeks, weekMenu } from '@/lib/roster/weekMenu'

// Reads the database, which Next can't see, so render on every request
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ week: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const week = canonicalWeek((await params).week, openWeek)
  return { title: weekTitle(week) }
}

export default async function RosterPage({ params }: Props) {
  const { week: param } = await params
  const week = canonicalWeek(param, openWeek)
  if (week !== param) redirect(`/roster/${week}`)

  const { staff, shifts, naNotes, leave, closedDays, roster, publish: state } = rosterWeek(week)
  // Read once, so the header and the grid agree on what day it is
  const now = today()
  const thisWeek = mondayOf(now)
  const onThisWeek = week === thisWeek

  return (
    <>
      <PageHead title="Roster">
        One week at a time. Click a cell to add a shift, or drag one to move it. Nothing reaches staff until you
        publish the week and share it.
      </PageHead>
      <div className="mb-3.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Keyed by week, so the menu is closed on the week it takes you to */}
        <WeekPicker
          key={week}
          week={week}
          thisWeek={thisWeek}
          items={weekMenu({ thisWeek, open: week, weeks: weekStates(menuWeeks(week)) })}
        />
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {onThisWeek && <span className="badge highlight">This week</span>}
          <span className="text-[11.5px] font-medium tracking-[0.09em] text-ink-3 uppercase">
            {weekSubtitle(week, state)}
          </span>
        </div>
      </div>

      {staff.length ? (
        // Keyed by week, so an open popover doesn't follow you to the next one
        <RosterGrid
          key={week}
          week={week}
          staff={staff}
          shifts={shifts}
          naNotes={naNotes}
          leave={leave}
          templates={templateList()}
          tradingHours={tradingSummary(tradingHoursWeek())}
          closedDays={closedDays}
          publish={state}
          unpublished={unpublishedShifts(state.status === 'published' ? (roster?.snapshot ?? null) : null, shifts)}
          payRates={payRatesFor(week)}
          previousShifts={shiftCount(addDays(week, -7))}
          lastAction={undoLabel(week)}
          today={now}
        />
      ) : (
        <NoRows everyoneInactive={hasStaff()} />
      )}
    </>
  )
}

function NoRows({ everyoneInactive }: { everyoneInactive: boolean }) {
  const staffPage = (
    <Link href="/staff" className="text-link text-[13px]">
      Staff page
    </Link>
  )
  return (
    <div className="rounded-card border border-line bg-surface px-5 py-8 text-center">
      {everyoneInactive ? (
        <>
          <p className="font-semibold">Everyone is inactive</p>
          <p className="mt-1 text-[13px] text-ink-2">
            Switch Active back on for anyone working again on the {staffPage}, and they get their row back.
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold">No one to roster yet</p>
          <p className="mt-1 text-[13px] text-ink-2">
            Add your team on the {staffPage}, and each person gets a row here.
          </p>
        </>
      )}
    </div>
  )
}
