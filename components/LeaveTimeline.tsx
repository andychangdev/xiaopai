'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { LeaveListRow } from '@/lib/db/queries'
import { dayLabel, shortDate, type IsoDate } from '@/lib/roster/dates'
import { describeLeave, isPast, leaveDays, leaveSpan, leaveTimeline, shortSpan } from '@/lib/roster/leave'
import { BookLeaveForm } from './BookLeaveForm'
import { useLeave } from './useLeave'
import { usePersonParam } from './usePersonParam'

/**
 * Everyone's leave over the next seven weeks, a row per person away and a
 * bar per booking, with a line at today. Overlaps, like four people out on
 * the same three days, show at a glance. A bar opens its person's panel, and
 * the person whose panel is open has their row highlighted. Leave that's
 * over and leave further ahead are a click away, as lists. On a phone the
 * bookings are a list, soonest first.
 */
export function LeaveTimeline({
  leave,
  order,
  staff,
  today,
}: {
  /** Everyone's bookings, with their names */
  leave: LeaveListRow[]
  /** Everyone's ids in roster order, so rows follow it */
  order: number[]
  /** Who leave can be booked for: everyone active */
  staff: { id: number; name: string }[]
  today: IsoDate
}) {
  const [selected, select] = usePersonParam()
  const [error, setError] = useState<string>()
  const [dialog, book, cancel] = useLeave(setError)
  const [booking, setBooking] = useState(false)
  const [list, setList] = useState<'past' | 'later' | null>(null)
  const timeline = leaveTimeline(leave, order, today)
  const nameOf = (id: number) => leave.find((l) => l.staffId === id)?.name ?? ''
  const upcoming = leave.filter((l) => !isPast(l, today))
  const day = (n: number) => `${(n / timeline.days) * 100}%`

  return (
    <section id="leave" aria-labelledby="leave-title" className="scroll-mt-4">
      <div className="mb-2.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="leave-title" className="text-[15px] font-semibold">
            Upcoming leave
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-2">
            Leave blocks rostering on those days. It spans as many weeks as it needs, and Clear week never touches it.
          </p>
        </div>
        {staff.length > 0 && !booking && (
          <button className="btn" onClick={() => setBooking(true)}>
            + Book leave
          </button>
        )}
      </div>
      {booking && (
        <div className="mb-3">
          <BookLeaveForm
            staff={staff}
            onBook={async ({ staffId, ...b }) => {
              if (!staffId) {
                setError("Pick who's away.")
                return false
              }
              return book({ ...b, staffId }, staff.find((p) => p.id === staffId)?.name ?? '')
            }}
            onDone={() => setBooking(false)}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="mb-2.5 text-[12.5px] text-crit-deep">
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="hidden sm:block">
          <div className="grid grid-cols-[96px_minmax(0,1fr)] border-b border-line bg-surface-3">
            <span className="px-3 py-2 text-[10.5px] font-semibold tracking-[0.09em] text-ink-3 uppercase">Who</span>
            <div className="grid grid-cols-7">
              {timeline.weeks.map((monday, i) => (
                <span
                  key={monday}
                  className={`border-l border-line px-1.5 py-2 font-mono text-[10.5px] ${i === 0 ? 'font-medium text-accent-deep' : 'text-ink-3'}`}
                >
                  {shortDate(monday)}
                </span>
              ))}
            </div>
          </div>
          {timeline.rows.map(({ staffId, bars }) => (
            <div
              key={staffId}
              className={`grid grid-cols-[96px_minmax(0,1fr)] border ${staffId === selected ? 'highlight' : 'border-transparent border-b-line'}`}
            >
              <span className="truncate px-3 py-2.5 text-[12.5px] font-semibold">{nameOf(staffId)}</span>
              <div className="relative min-h-10 bg-[repeating-linear-gradient(90deg,var(--color-line)_0_1px,transparent_1px_calc(100%/7))]">
                <span aria-hidden className="absolute inset-y-0 w-0.5 bg-accent" style={{ left: day(timeline.today + 0.5) }} />
                {bars.map(({ leave: l, from, length, cutStart, cutEnd }) => (
                  <button
                    key={l.id}
                    data-keeps-panel
                    aria-label={`${l.name} away ${describeLeave(l)}`}
                    title={`${describeLeave(l)}. Open ${l.name}`}
                    className={`absolute inset-y-2 flex items-center overflow-hidden border border-warn-line bg-warn-bg px-1.5 text-[10.5px] font-semibold whitespace-nowrap text-warn-deep hover:border-warn ${cutStart ? 'rounded-l-none border-l-0' : 'rounded-l-chip'} ${cutEnd ? 'rounded-r-none border-r-0' : 'rounded-r-chip'}`}
                    style={{ left: day(from), width: day(length) }}
                    onClick={() => select(l.staffId)}
                  >
                    <FitLabel options={labels(l)} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!timeline.rows.length && (
            <p className="px-3.5 py-3 text-[13px] text-ink-3">No one is away in the next seven weeks.</p>
          )}
        </div>
        <ul className="sm:hidden">
          {upcoming.map((l) => (
            <LeaveLine key={l.id} leave={l} onCancel={() => cancel(l)} />
          ))}
          {!upcoming.length && <li className="px-3.5 py-3 text-[13px] text-ink-3">No leave booked.</li>}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-line bg-surface-3 px-3 py-2 text-[11.5px] text-ink-2">
          <span className="hidden items-center gap-1.5 sm:flex">
            <span aria-hidden className="h-0.5 w-2.5 bg-accent" />
            Today, {dayLabel(today)}
          </span>
          <span className="flex gap-4">
            {timeline.past.length > 0 && (
              <ListToggle open={list === 'past'} onClick={() => setList(list === 'past' ? null : 'past')}>
                Past leave · {timeline.past.length}
              </ListToggle>
            )}
            {timeline.later.length > 0 && (
              <span className="hidden sm:inline">
                <ListToggle open={list === 'later'} onClick={() => setList(list === 'later' ? null : 'later')}>
                  Later · {timeline.later.length}
                </ListToggle>
              </span>
            )}
          </span>
        </div>
        {list && (
          <ul id="leave-list" className="border-t border-line">
            {(list === 'past' ? timeline.past : timeline.later).map((l) => (
              <LeaveLine key={l.id} leave={l} past={list === 'past'} onCancel={() => cancel(l)} />
            ))}
          </ul>
        )}
      </div>
      {dialog}
    </section>
  )
}

/**
 * What a bar can say, fullest first: the note and dates, the dates, and
 * within one month just the days ('11–13'), which the week columns place.
 */
function labels(l: LeaveListRow): string[] {
  const span = shortSpan(l)
  const sameMonth = l.fromDate.slice(0, 7) === l.toDate.slice(0, 7)
  return [l.note ? `${l.note} · ${span}` : span, span, ...(sameMonth ? [span.split(' ')[0]] : [])]
}

function ListToggle({ open, onClick, children }: { open: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button aria-expanded={open} aria-controls="leave-list" className="font-semibold text-accent-deep hover:underline" onClick={onClick}>
      {children}
    </button>
  )
}

/** One booking as a line of a list: who, when, why, how long, and Cancel. */
function LeaveLine({ leave: l, past = false, onCancel }: { leave: LeaveListRow; past?: boolean; onCancel: () => void }) {
  const days = leaveDays(l)
  return (
    <li className={`flex items-center justify-between gap-3 border-b border-line px-3 py-2 last:border-b-0 ${past ? 'text-ink-3' : ''}`}>
      <span className="min-w-0">
        <span className="block text-[12.5px]">
          <b className="font-semibold">{l.name}</b> · {leaveSpan(l)}
        </span>
        <span className="block truncate text-[11.5px] text-ink-3">
          {[l.note, `${days} ${days === 1 ? 'day' : 'days'}`].filter(Boolean).join(' · ')}
        </span>
      </span>
      <button
        className="text-link text-ink-3 hover:text-crit-deep focus-visible:text-crit-deep"
        aria-label={`Cancel ${l.name}'s leave, ${leaveSpan(l)}`}
        onClick={onCancel}
      >
        Cancel
      </button>
    </li>
  )
}

/**
 * The fullest of these labels that fits its bar, or none: measured against
 * the bar's width, so nothing is cut off mid-word. The bar's own name says
 * the whole booking either way.
 */
function FitLabel({ options }: { options: string[] }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState<string | null>(null)
  const key = options.join('\n')

  useLayoutEffect(() => {
    const label = ref.current!
    const bar = label.parentElement!
    const pen = document.createElement('canvas').getContext('2d')!
    function fit() {
      const style = getComputedStyle(label)
      pen.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const { paddingLeft, paddingRight } = getComputedStyle(bar)
      const room = bar.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight)
      setShown(key.split('\n').find((o) => pen.measureText(o).width <= room) ?? null)
    }
    fit()
    const resized = new ResizeObserver(fit)
    resized.observe(bar)
    return () => resized.disconnect()
  }, [key])

  return (
    <span ref={ref} aria-hidden>
      {shown}
    </span>
  )
}
