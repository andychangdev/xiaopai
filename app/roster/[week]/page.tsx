import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PublishBadge } from '@/components/PublishBadge'
import { RosterGrid } from '@/components/RosterGrid'
import { today } from '@/lib/clock'
import {
  hasStaff,
  openWeek,
  payRatesFor,
  rosterWeek,
  shiftCount,
  templateList,
  tradingHoursWeek,
} from '@/lib/db/queries'
import { undoLabel } from '@/lib/db/undo'
import { addDays, canonicalWeek, mondayOf, weekRange, weekTitle, type IsoDate } from '@/lib/roster/dates'
import { weekSubtitle } from '@/lib/roster/publish'
import { tradingSummary } from '@/lib/roster/settings'

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
  // Read once, so the header and the grid agree on what day it is
  const now = today()
  const thisWeek = mondayOf(now)
  const onThisWeek = week === thisWeek

  return (
    <>
      <div className="mb-3.5 flex items-center gap-2.5">
        <Today week={thisWeek} here={onThisWeek} />
        <WeekArrow href={`/roster/${addDays(week, -7)}`} label="Previous week">
          ‹
        </WeekArrow>
        <WeekArrow href={`/roster/${addDays(week, 7)}`} label="Next week">
          ›
        </WeekArrow>
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h1 className="text-[19px] font-semibold tracking-[-0.01em]">{weekTitle(week)}</h1>
            {onThisWeek && (
              <span className="text-[11px] font-semibold tracking-[0.09em] whitespace-nowrap text-accent-deep uppercase">
                This week
              </span>
            )}
            <PublishBadge key={`badge-${week}`} week={week} state={state} />
          </div>
          <div className="text-[11.5px] font-medium tracking-[0.09em] text-ink-3 uppercase">
            {weekSubtitle(week, state)}
          </div>
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

// The week buttons, as tall as each other
const weekButton = 'grid h-7.5 place-items-center rounded-control border border-line bg-surface text-ink-2'
const weekLink = `${weekButton} hover:border-line-strong hover:text-ink`

function WeekArrow({ href, label, children }: { href: string; label: string; children: string }) {
  return (
    <Link href={href} title={label} aria-label={label} className={`${weekLink} w-7.5 text-[15px]`}>
      {children}
    </Link>
  )
}

/** Back to the week with today in it, from wherever you are. Greyed out once you're there. */
function Today({ week, here }: { week: IsoDate; here: boolean }) {
  const size = 'px-2.5 text-[12.5px] font-medium whitespace-nowrap'
  if (here) {
    return (
      <button disabled className={`${weekButton} ${size} opacity-50`}>
        Today
      </button>
    )
  }
  return (
    <Link href={`/roster/${week}`} title={`Go to this week, ${weekRange(week)}`} className={`${weekLink} ${size}`}>
      Today
    </Link>
  )
}
