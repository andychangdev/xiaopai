'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { LeaveListRow } from '@/lib/db/queries'
import { dayLabel, shortDate, type IsoDate } from '@/lib/roster/dates'
import { daySpan, describeLeave, isPast, leaveDays, leaveSpan, leaveTimeline, shortSpan } from '@/lib/roster/leave'
import { LeaveForm } from './LeaveForm'
import { ListHead } from './Page'
import { useLeave } from './useLeave'
import { usePanelParam } from './usePanelParam'

/**
 * Everyone's leave over the next seven weeks, a row per person away and a
 * bar per booking, with a line at today. Overlaps, like four people out on
 * the same three days, show at a glance. A bar opens the booking in the
 * page's panel, to change it or cancel it, and has the highlight while it's
 * there, as the person whose panel is open has on their row. Hovering one
 * shows who, when and why, which a short bar has no room to say. Leave that's
 * over and leave further ahead are a click away, as lists. On a phone the
 * bookings are a list, soonest first, and a line opens the same panel.
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
  const [selected] = usePanelParam('person')
  const [booked, openBooking] = usePanelParam('leave')
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
      <ListHead
        id="leave-title"
        title="Upcoming leave"
        note="Leave blocks rostering on those days. It spans as many weeks as it needs, and Clear week never touches it."
        action={
          staff.length > 0 &&
          !booking && (
            <button className="btn" onClick={() => setBooking(true)}>
              + Book leave
            </button>
          )
        }
      />
      {booking && (
        <div className="mb-3">
          <LeaveForm
            staff={staff}
            onSave={async ({ staffId, ...b }) => {
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
                    data-leave={l.id}
                    data-keeps-panel
                    aria-label={`${l.name} away ${describeLeave(l)}`}
                    aria-expanded={l.id === booked}
                    className={`group absolute inset-y-2 flex items-center border px-1.5 text-[10.5px] font-semibold whitespace-nowrap ${l.id === booked ? 'highlight' : 'border-warn-line bg-warn-bg text-warn-deep hover:border-warn'} ${cutStart ? 'rounded-l-none border-l-0' : 'rounded-l-chip'} ${cutEnd ? 'rounded-r-none border-r-0' : 'rounded-r-chip'}`}
                    // On a narrow screen a day can be thinner than a bar's padding, so a
                    // one-day bar reaches into the next. One ending on the last day goes
                    // from the right, so it reaches back instead of off the end.
                    style={
                      from + length === timeline.days
                        ? { right: 0, width: day(length) }
                        : { left: day(from), width: day(length) }
                    }
                    onClick={() => openBooking(l.id)}
                  >
                    <FitLabel options={labels(l)} />
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute bottom-full z-10 mb-1.5 hidden w-max rounded-chip border border-line-strong bg-surface px-2 py-1 text-[11.5px] font-medium text-ink shadow-popover group-hover:block group-focus-visible:block ${cardAt(from + length / 2, timeline.days)}`}
                    >
                      <b className="font-semibold">{l.name}</b> · {describeLeave(l)}
                    </span>
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
            <LeaveLine
              key={l.id}
              leave={l}
              open={l.id === booked}
              onOpen={() => openBooking(l.id)}
              onCancel={() => cancel(l)}
            />
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
              <LeaveLine
                key={l.id}
                leave={l}
                open={l.id === booked}
                onOpen={list === 'later' ? () => openBooking(l.id) : undefined}
                onCancel={() => cancel(l)}
              />
            ))}
          </ul>
        )}
      </div>
      {dialog}
    </section>
  )
}

/** A bar's label, and for the small ones that run edge to edge, their type size. */
type Fit = { text: string; size?: string }

/** Smaller and smaller, for a bar too short for its days at full size */
const SMALL = ['9.5px', '8.5px']

/**
 * What a bar can say, fullest first: the note and dates, the dates, and just
 * the days ('11–13'), which the week columns place. Then, for a bar of a day
 * or two, the days in smaller type, edge to edge, or failing that the first
 * of them, so even the shortest booking says when it is.
 */
function labels(l: LeaveListRow): Fit[] {
  const span = shortSpan(l)
  const days = daySpan(l)
  const first = daySpan({ fromDate: l.fromDate, toDate: l.fromDate })
  return [
    ...(l.note ? [{ text: `${l.note} · ${span}` }] : []),
    { text: span },
    { text: days },
    ...SMALL.map((size) => ({ text: days, size })),
    ...(first !== days ? SMALL.map((size) => ({ text: first, size })) : []),
  ]
}

/**
 * Where a bar's hover card sits, so it stays inside the timeline: from the
 * bar's left edge in the first third, from its right in the last, otherwise
 * centred over it.
 */
function cardAt(middle: number, days: number): string {
  if (middle < days / 3) return 'left-0'
  if (middle > (days * 2) / 3) return 'right-0'
  return 'left-1/2 -translate-x-1/2'
}

function ListToggle({ open, onClick, children }: { open: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button aria-expanded={open} aria-controls="leave-list" className="font-semibold text-accent-deep hover:underline" onClick={onClick}>
      {children}
    </button>
  )
}

/**
 * One booking as a line of a list: who, when, why, how long, and Cancel.
 * Leave still to come opens in the panel, and has the highlight while it's
 * there; leave that's over is greyed.
 */
function LeaveLine({
  leave: l,
  open = false,
  onOpen,
  onCancel,
}: {
  leave: LeaveListRow
  open?: boolean
  onOpen?: () => void
  onCancel: () => void
}) {
  const days = leaveDays(l)
  const what = (
    <>
      <span className="block text-[12.5px]">
        <b className="font-semibold">{l.name}</b> · {leaveSpan(l)}
      </span>
      <span className="block truncate text-[11.5px] text-ink-3">
        {[l.note, `${days} ${days === 1 ? 'day' : 'days'}`].filter(Boolean).join(' · ')}
      </span>
    </>
  )
  return (
    <li
      className={`flex items-center justify-between gap-3 border px-3 py-2 ${open ? 'highlight' : 'border-transparent border-b-line last:border-b-transparent'} ${onOpen ? '' : 'text-ink-3'}`}
    >
      {onOpen ? (
        <button
          data-leave={l.id}
          data-keeps-panel
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
          aria-label={`Change ${l.name}'s leave, ${describeLeave(l)}`}
          onClick={onOpen}
        >
          {what}
        </button>
      ) : (
        <span className="min-w-0">{what}</span>
      )}
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
 * the bar's width, so nothing is cut off mid-word. A small one ignores the
 * bar's padding. The hover card says the whole booking either way.
 */
function FitLabel({ options }: { options: Fit[] }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState<Fit | null>(null)
  const key = JSON.stringify(options)

  useLayoutEffect(() => {
    const bar = ref.current!.parentElement!
    const pen = document.createElement('canvas').getContext('2d')!
    let live = true
    function fit() {
      const { fontWeight, fontSize, fontFamily, paddingLeft, paddingRight } = getComputedStyle(bar)
      const room = bar.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight)
      const fits = ({ text, size }: Fit) => {
        pen.font = `${fontWeight} ${size ?? fontSize} ${fontFamily}`
        return pen.measureText(text).width <= (size ? bar.clientWidth - 2 : room)
      }
      setShown((JSON.parse(key) as Fit[]).find(fits) ?? null)
    }
    fit()
    document.fonts.ready.then(() => live && fit()) // again in the page's own font, once it's in
    const resized = new ResizeObserver(fit)
    resized.observe(bar)
    return () => {
      live = false
      resized.disconnect()
    }
  }, [key])

  return (
    <span
      ref={ref}
      aria-hidden
      className={shown?.size ? 'absolute inset-0 flex items-center justify-center' : 'min-w-0 overflow-hidden'}
      style={shown?.size ? { fontSize: shown.size } : undefined}
    >
      {shown?.text}
    </span>
  )
}
