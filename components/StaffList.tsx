'use client'

import { AnimatePresence, Reorder, useDragControls } from 'motion/react'
import { useEffect, useOptimistic, useRef, useState, useTransition, type ReactNode } from 'react'
import { moveStaff } from '@/app/actions'
import type { LeaveListRow, StaffListRow } from '@/lib/db/queries'
import { formatRate } from '@/lib/roster/cost'
import { DAY_NAMES, type IsoDate } from '@/lib/roster/dates'
import { initialOf, moveInOrder, placeAmong } from '@/lib/roster/staff'
import { AddPersonForm } from './AddPersonForm'
import { GripIcon } from './Icons'
import { LeavePanel } from './LeavePanel'
import { ListHead } from './Page'
import { StaffPanel } from './StaffPanel'
import { UNREACHABLE } from './ShiftPopover'
import { usePanelParam } from './usePanelParam'

/**
 * Everyone, one line each in the roster's order, with inactive people folded
 * away at the foot. Active people drag by the handle at the start of their
 * line, the others moving out of the way as they go, and with the handle
 * focused the arrow keys move them a place at a time. Clicking someone opens their panel beside the list, or over it on a
 * narrow screen, with their leave. What goes under the list comes in as
 * children, and a booking clicked there opens in the same panel.
 */
export function StaffList({
  staff,
  leave,
  today,
  children,
}: {
  staff: StaffListRow[]
  /** Everyone's bookings, soonest first */
  leave: LeaveListRow[]
  today: IsoDate
  children?: ReactNode
}) {
  const [selected, select] = usePanelParam('person')
  const [booked] = usePanelParam('leave')
  const [error, setError] = useState<string>()
  const [adding, setAdding] = useState(false)
  // A line moves the moment it's dropped, rather than when the server answers
  const [rows, reorder] = useOptimistic(staff, (rows, to: { id: number; place: number }) =>
    moveInOrder(rows, to.id, to.place),
  )
  const [, startTransition] = useTransition()
  const active = rows.filter((p) => p.active)
  const inactive = rows.filter((p) => !p.active)
  const person = selected === null ? undefined : rows.find((p) => p.id === selected)
  const leaveOf = (id: number) => leave.filter((l) => l.staffId === id)
  const booking = booked === null ? undefined : leave.find((l) => l.id === booked)
  // Open while the person in the panel is in it, and after that as you leave it
  const [showInactive, setShowInactive] = useState(person?.active === false)
  const inPanelInactive = person?.active === false
  useEffect(() => {
    if (inPanelInactive) setShowInactive(true)
  }, [inPanelInactive])

  // Whose handle the arrow keys just moved. React moves a line's node to
  // reorder it, which can take focus off the handle, so it's put back.
  const refocus = useRef<number | null>(null)
  useEffect(() => {
    if (refocus.current === null) return
    document.querySelector<HTMLElement>(`[data-handle="${refocus.current}"]`)?.focus()
    refocus.current = null
  }, [rows])

  /** To the gap among the active lines, 0 above the first. `then` goes in the same step as the move. */
  function move(id: number, gap: number, then?: () => void) {
    const place = placeAmong(rows, active, id, gap)
    startTransition(async () => {
      then?.()
      reorder({ id, place })
      setError((await moveStaff(id, place).catch(() => ({ error: UNREACHABLE }))).error)
    })
  }

  // The order a line's being dragged through, the others making room as it goes
  const [dragged, setDragged] = useState<StaffListRow[] | null>(null)
  const lines = dragged ?? active

  function drop(id: number) {
    const from = active.findIndex((p) => p.id === id)
    const to = lines.findIndex((p) => p.id === id)
    if (to === from) {
      setDragged(null)
      return
    }
    // As a gap among the lines as they were: below the one it passed going down, above it going up.
    // The dragged order holds until the move shows, so the line doesn't jump back between them.
    move(id, to > from ? to + 1 : to, () => setDragged(null))
  }

  /**
   * Closing with Esc or ×, focus goes back to their line, or the booking's
   * bar, so the keyboard carries on from there.
   */
  function close(refocus = true) {
    const opener = selected !== null ? `[data-person="${selected}"]` : booked !== null ? `[data-leave="${booked}"]` : null
    select(null) // there's one panel, so this closes either
    if (!refocus || !opener) return
    // The timeline's bar or, on a phone, the list's line: whichever shows
    ;[...document.querySelectorAll<HTMLElement>(opener)].find((el) => el.checkVisibility())?.focus()
  }

  return (
    // On a wide screen, People and Upcoming leave are two rows, with the
    // panel's column beside them. Someone's panel runs down both, so it stays
    // in view over their leave; a booking's sits level with the timeline. Any
    // height the panel has over the lists goes under the timeline.
    <div className="grid items-start gap-x-4 gap-y-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr]">
      <section aria-labelledby="people-title" className="min-w-0">
        <ListHead
          id="people-title"
          title="People"
          note="In roster order. Drag the handle to rearrange, and click someone to change their details."
          action={
            !adding && (
              <button className="btn" onClick={() => setAdding(true)}>
                + Add person
              </button>
            )
          }
        />
        {adding && (
          <div className="mb-3">
            <AddPersonForm onDone={() => setAdding(false)} />
          </div>
        )}
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <Reorder.Group as="ul" axis="y" values={lines} onReorder={setDragged}>
            {lines.map((p, i) => (
              <Line
                key={p.id}
                person={p}
                selected={p.id === selected}
                onOpen={() => select(p.id)}
                drag={{
                  onEnd: () => drop(p.id),
                  // A place up is the gap above the one before; a place down, the gap below the one after
                  onMove: (by) => {
                    const to = by < 0 ? i - 1 : i + 2
                    if (to < 0 || to > active.length) return
                    refocus.current = p.id
                    move(p.id, to)
                  },
                }}
              />
            ))}
          </Reorder.Group>
          {!active.length && (
            <p className="px-3.5 py-3 text-[13px] text-ink-3">No one active. Add someone, or switch someone back on.</p>
          )}
          {inactive.length > 0 && (
            <details
              open={showInactive}
              onToggle={(e) => setShowInactive(e.currentTarget.open)}
              className="border-t border-line bg-surface-3"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-[12px] text-ink-2 [&::-webkit-details-marker]:hidden">
                <span>
                  <b className="font-semibold text-ink">Inactive · {inactive.length}</b>
                  <span className="ml-2">Off new weeks, still on any week where they have shifts.</span>
                </span>
                <span className="font-semibold text-accent-deep">{showInactive ? 'Hide' : 'Show'}</span>
              </summary>
              <ul className="border-t border-line bg-surface">
                {inactive.map((p) => (
                  <Line
                    key={p.id}
                    person={p}
                        selected={p.id === selected}
                    onOpen={() => select(p.id)}
                  />
                ))}
              </ul>
            </details>
          )}
          {error && (
            <p role="alert" className="border-t border-line px-3.5 py-2.5 text-[12.5px] text-crit-deep">
              {error}
            </p>
          )}
        </div>
      </section>
      <div className="min-w-0 lg:col-start-1 lg:row-start-2">{children}</div>
      {/* Present while it closes, so it can slide away */}
      <AnimatePresence>
        {person ? (
          // Keyed, so a box half-typed for one person doesn't carry over to the next
          <StaffPanel
            key={`person-${person.id}`}
            person={person}
            leave={leaveOf(person.id)}
            today={today}
            onClose={() => close()}
            onDismiss={() => close(false)}
            className="lg:col-start-2 lg:row-[1/span_2]"
          />
        ) : (
          booking && (
            <LeavePanel
              key={`leave-${booking.id}`}
              leave={booking}
              onClose={() => close()}
              onDismiss={() => close(false)}
              className="lg:col-start-2 lg:row-start-2"
            />
          )
        )}
      </AnimatePresence>
      {!person && !booking && (
        // Level with the list, under its heading
        <p className="mt-13 hidden rounded-card border border-dashed border-line-strong px-4 py-5 text-[12.5px] text-ink-3 lg:col-start-2 lg:row-start-1 lg:block">
          Click someone to see and change their hours, rate, availability and notes, or a booking to change it.
        </p>
      )}
    </div>
  )
}

/**
 * One person's line. Active people have a handle to drag them by, by mouse or
 * finger, and the line lifts off the list as it goes.
 */
function Line({
  person,
  selected,
  onOpen,
  drag,
}: {
  person: StaffListRow
  selected: boolean
  onOpen: () => void
  drag?: {
    /** Let go, wherever it's got to */
    onEnd: () => void
    /** A place up (-1) or down (1), from the arrow keys */
    onMove: (by: -1 | 1) => void
  }
}) {
  const controls = useDragControls()
  const days = DAY_NAMES.filter((_, i) => person.available[i])
  const usually = days.length === 7 ? 'every day' : days.length ? days.join(', ') : 'no days'
  const rate = person.hourlyRate === null ? null : formatRate(person.hourlyRate)
  const hours = person.expectedHours

  const look = `relative flex items-center border px-1.5 ${selected ? 'highlight' : 'border-transparent border-b-line bg-surface'} ${person.active ? '' : 'text-ink-3'}`
  const content = (
    <>
      {drag ? (
        <button
          data-handle={person.id}
          data-keeps-panel
          aria-label={`Move ${person.name} up or down, with the arrow keys`}
          title="Drag to reorder, or use the arrow keys"
          // touch-none, so a finger on it drags the line rather than scrolling the page
          className="grid h-10 w-6 flex-none cursor-grab touch-none place-items-center text-ink-3 hover:text-ink active:cursor-grabbing"
          onPointerDown={(e) => controls.start(e)}
          onKeyDown={(e) => {
            const by = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
            if (!by) return
            e.preventDefault() // rather than scroll the page
            drag.onMove(by)
          }}
        >
          <GripIcon />
        </button>
      ) : (
        <span aria-hidden className="w-6 flex-none" />
      )}
      <button
        data-person={person.id}
        data-keeps-panel
        aria-expanded={selected}
        className="grid min-w-0 flex-1 grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 pr-2 pl-1 text-left sm:grid-cols-[30px_minmax(0,1fr)_76px_52px_68px]"
        onClick={onOpen}
      >
        <span
          aria-hidden
          className={`grid size-7.5 place-items-center rounded-full text-[12px] font-semibold ${selected ? 'bg-accent-line/50' : 'bg-surface-2 text-ink-2'}`}
        >
          {initialOf(person.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{person.name}</span>
          {person.notes && <span className="block truncate text-[11.5px] text-ink-3">{person.notes}</span>}
        </span>
        <span title={`Usually available ${usually}`} className="hidden items-center gap-0.75 sm:flex">
          <span className="sr-only">Usually available {usually}.</span>
          {person.available.map((on, i) => (
            <span
              key={DAY_NAMES[i]}
              aria-hidden
              className={`size-1.75 rounded-full ${on ? (person.active ? 'bg-accent' : 'bg-ink-3') : 'bg-line'}`}
            />
          ))}
        </span>
        <Figure className="hidden sm:block" value={hours === null ? null : String(hours)} unit="hrs / wk" />
        <span className="text-right sm:contents">
          <Figure value={rate} unit="per hour" />
          {hours !== null && <span className="block text-right text-[10.5px] text-ink-3 sm:hidden">{hours} h/wk</span>}
        </span>
      </button>
    </>
  )

  if (!drag) return <li className={look}>{content}</li>
  return (
    <Reorder.Item
      as="li"
      value={person}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ zIndex: 10, boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)' }}
      onDragEnd={drag.onEnd}
      className={look}
    >
      {content}
    </Reorder.Item>
  )
}

function Figure({ value, unit, className = '' }: { value: string | null; unit: string; className?: string }) {
  return (
    <span className={`text-right ${className}`}>
      <span className="block font-mono text-[12.5px] tabular-nums">
        {value ?? (
          <>
            <span aria-hidden>—</span>
            <span className="sr-only">no {unit === 'per hour' ? 'hourly rate' : 'expected hours'}</span>
          </>
        )}
      </span>
      <span aria-hidden className="block text-[10px] text-ink-3">
        {unit}
      </span>
    </span>
  )
}
