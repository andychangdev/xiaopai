import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CopyPreviousWeek } from '@/components/CopyPreviousWeek'
import { PublishButton } from '@/components/PublishButton'
import { RosterGrid } from '@/components/RosterGrid'
import { today } from '@/lib/clock'
import { hasStaff, openWeek, rosterWeek, shiftCount, templateList, tradingHoursWeek } from '@/lib/db/queries'
import { addDays, canonicalWeek, weekTitle } from '@/lib/roster/dates'
import { weekTotal } from '@/lib/roster/hours'
import { publishBadge, weekSubtitle, type PublishState } from '@/lib/roster/publish'
import { tradingSummary } from '@/lib/roster/settings'
import { buildWarnings } from '@/lib/roster/warnings'

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

  const { staff, shifts, naNotes, leave, closedDays, publish: state } = rosterWeek(week)

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3.5">
        <div className="flex items-center gap-2.5">
          <WeekArrow href={`/roster/${addDays(week, -7)}`} label="Previous week">
            ‹
          </WeekArrow>
          <WeekArrow href={`/roster/${addDays(week, 7)}`} label="Next week">
            ›
          </WeekArrow>
          <div>
            <h1 className="text-[19px] font-semibold tracking-[-0.01em]">{weekTitle(week)}</h1>
            <div className="text-[11.5px] font-medium tracking-[0.09em] text-ink-3 uppercase">
              {weekSubtitle(week, state)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge state={state} />
          <CopyPreviousWeek
            key={week}
            week={week}
            shifts={shifts.length}
            previousShifts={shiftCount(addDays(week, -7))}
          />
          <PublishButton
            key={`publish-${week}`}
            week={week}
            state={state}
            shifts={shifts.length}
            minutes={weekTotal(shifts)}
            warnings={buildWarnings({ staff, shifts, naNotes, leave, weekStart: week }).length}
            today={today()}
          />
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
        />
      ) : (
        <NoRows everyoneInactive={hasStaff()} />
      )}
    </>
  )
}

/** Draft and Unpublished changes in amber, since both still need publishing; Published in the accent. */
function Badge({ state }: { state: PublishState }) {
  const live = state.status === 'published' && !state.changed
  return (
    <span
      className={`rounded-full border px-[9px] py-1 text-[11px] font-semibold tracking-[0.07em] uppercase ${live ? 'border-accent text-accent' : 'border-warn-line bg-warn-bg text-warn'}`}
    >
      {publishBadge(state)}
    </span>
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
            Tick Active on the {staffPage} for anyone working again, and they get their row back.
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

function WeekArrow({ href, label, children }: { href: string; label: string; children: string }) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="grid size-[30px] place-items-center rounded-control border border-line bg-surface text-[15px] text-ink-2 hover:border-line-strong hover:text-ink"
    >
      {children}
    </Link>
  )
}
