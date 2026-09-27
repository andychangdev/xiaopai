import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RosterGrid } from '@/components/RosterGrid'
import { today } from '@/lib/clock'
import { hasStaff, rosterWeek, templateList } from '@/lib/db/queries'
import { addDays, canonicalWeek, dayLabel, weekTitle } from '@/lib/roster/dates'

// Reads the database, which Next can't see, so render on every request
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ week: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const week = canonicalWeek((await params).week, today())
  return { title: weekTitle(week) }
}

export default async function RosterPage({ params }: Props) {
  const { week: param } = await params
  const week = canonicalWeek(param, today())
  if (week !== param) redirect(`/roster/${week}`)

  const { staff, shifts } = rosterWeek(week)

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
              Week of {dayLabel(week)}
            </div>
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
          templates={templateList()}
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
