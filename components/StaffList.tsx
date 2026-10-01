'use client'

import { useEffect, useOptimistic, useRef, useState, useTransition, type ReactNode } from 'react'
import { moveStaff } from '@/app/actions'
import type { LeaveListRow, StaffListRow } from '@/lib/db/queries'
import { formatRate } from '@/lib/roster/cost'
import { DAY_NAMES, type IsoDate } from '@/lib/roster/dates'
import { awayLabel } from '@/lib/roster/leave'
import { initialOf, moveInOrder, placeAmong } from '@/lib/roster/staff'
import { GripIcon } from './Icons'
import { StaffPanel } from './StaffPanel'
import { UNREACHABLE } from './ShiftPopover'
import { usePersonParam } from './usePersonParam'

/** The Staff page's way in to adding someone: an empty panel. */
export function AddPersonButton() {
  const [, select] = usePersonParam()
  return (
    <button className="btn btn-primary" onClick={() => select('new')}>
      + Add person
    </button>
  )
}

/**
 * Everyone, one line each in the roster's order, with inactive people folded
 * away at the foot. Active people drag by the handle at the start of their
 * line, and with the handle focused the arrow keys move them a place at a
 * time. Clicking someone opens their panel beside the list, or over it on a
 * narrow screen, with their leave. Each line shows the next leave coming up.
 * What goes under the list comes in as children.
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
  const [selected, select] = usePersonParam()
  const [error, setError] = useState<string>()
  // A line moves the moment it's dropped, rather than when the server answers
  const [rows, reorder] = useOptimistic(staff, (rows, to: { id: number; place: number }) =>
    moveInOrder(rows, to.id, to.place),
  )
  const [, startTransition] = useTransition()
  const active = rows.filter((p) => p.active)
  const inactive = rows.filter((p) => !p.active)
  const person = typeof selected === 'number' ? rows.find((p) => p.id === selected) : undefined
  const leaveOf = (id: number) => leave.filter((l) => l.staffId === id)
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

  function move(id: number, gap: number) {
    const place = placeAmong(rows, active, id, gap)
    startTransition(async () => {
      reorder({ id, place })
      setError((await moveStaff(id, place).catch(() => ({ error: UNREACHABLE }))).error)
    })
  }

  const [dragging, setDragging] = useState<number | null>(null)
  // The gap a drop would land in, 0 above the first line, so it can show it
  const [gap, setGap] = useState<number | null>(null)
  const dragFrame = useRef(0)
  const from = active.findIndex((p) => p.id === dragging)
  // Either side of the line being dragged is where it already is
  const shownGap = gap === from || gap === from + 1 ? null : gap

  function startDrag(id: number) {
    // A frame later, once the browser has its picture of the line, which would otherwise be the dimmed one
    dragFrame.current = requestAnimationFrame(() => setDragging(id))
  }

  function endDrag() {
    cancelAnimationFrame(dragFrame.current)
    setDragging(null)
    setGap(null)
  }

  function drop() {
    endDrag()
    if (from < 0 || shownGap === null) return
    move(active[from].id, shownGap)
  }

  function close() {
    const id = selected
    select(null)
    // Back to their line, so the keyboard carries on from where it was
    if (typeof id === 'number') document.querySelector<HTMLElement>(`[data-person="${id}"]`)?.focus()
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid min-w-0 gap-4">
        <section aria-label="People" className="overflow-hidden rounded-card border border-line bg-surface">
          <ul
            onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setGap(null)}
            // Only while a line's being dragged, so nothing else drops here
            onDrop={
              dragging !== null
                ? (e) => {
                    e.preventDefault()
                    drop()
                  }
                : undefined
            }
          >
            {active.map((p, i) => (
              <Line
                key={p.id}
                person={p}
                away={awayLabel(leaveOf(p.id), today)}
                selected={p.id === selected}
                onOpen={() => select(p.id)}
                drag={{
                  dragged: p.id === dragging,
                  drop: shownGap === i ? 'above' : shownGap === active.length && i === active.length - 1 ? 'below' : undefined,
                  onStart: () => startDrag(p.id),
                  onEnd: endDrag,
                  onOver: dragging !== null ? (below) => setGap(below ? i + 1 : i) : undefined,
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
          </ul>
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
                    away={awayLabel(leaveOf(p.id), today)}
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
        </section>
        {children}
      </div>
      {person || selected === 'new' ? (
        // Keyed, so a box half-typed for one person doesn't carry over to the next
        <StaffPanel
          key={person?.id ?? 'new'}
          person={person ?? 'new'}
          leave={person ? leaveOf(person.id) : []}
          today={today}
          onClose={close}
          onAdded={(id) => select(id)}
        />
      ) : (
        <p className="hidden rounded-card border border-dashed border-line-strong px-4 py-5 text-[12.5px] text-ink-3 lg:block">
          Click someone to see and change their hours, rate, availability and notes.
        </p>
      )}
    </div>
  )
}

/**
 * One person's line. Active people have a handle to drag them by; while one's
 * being dragged, a line shows where it would land.
 */
function Line({
  person,
  away,
  selected,
  onOpen,
  drag,
}: {
  person: StaffListRow
  /** Their next leave, for the chip after their name */
  away: string | null
  selected: boolean
  onOpen: () => void
  drag?: {
    dragged: boolean
    /** Which edge the line goes on, when a drop would land next to this one */
    drop?: 'above' | 'below'
    onStart: () => void
    onEnd: () => void
    /** While a line's being dragged, whether the pointer's over this one's lower half */
    onOver?: (below: boolean) => void
    /** A place up (-1) or down (1), from the arrow keys */
    onMove: (by: -1 | 1) => void
  }
}) {
  const days = DAY_NAMES.filter((_, i) => person.available[i])
  const usually = days.length === 7 ? 'every day' : days.length ? days.join(', ') : 'no days'
  const rate = person.hourlyRate === null ? null : formatRate(person.hourlyRate)
  const hours = person.expectedHours

  return (
    <li
      className={`flex items-center border px-1.5 ${selected ? 'highlight' : 'border-transparent border-b-line'} ${drag?.dragged ? 'opacity-40' : ''} ${drag?.drop ? dropLine[drag.drop] : ''} ${person.active ? '' : 'text-ink-3'}`}
      onDragOver={
        drag?.onOver &&
        ((e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          const { top, height } = e.currentTarget.getBoundingClientRect()
          drag.onOver!(e.clientY > top + height / 2)
        })
      }
    >
      {drag ? (
        <button
          draggable
          data-handle={person.id}
          aria-label={`Move ${person.name} up or down, with the arrow keys`}
          title="Drag to reorder, or use the arrow keys"
          className="grid h-10 w-6 flex-none cursor-grab place-items-center text-ink-3 hover:text-ink"
          onDragStart={(e) => {
            // The whole line goes with the pointer, not just the handle
            const line = e.currentTarget.closest('li')!
            const { left, top } = line.getBoundingClientRect()
            e.dataTransfer.setDragImage(line, e.clientX - left, e.clientY - top)
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', person.name)
            drag.onStart()
          }}
          onDragEnd={drag.onEnd}
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
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-semibold">{person.name}</span>
            {away && (
              <span className="flex-none rounded-full border border-warn-line bg-warn-bg px-1.75 text-[10.5px] font-semibold whitespace-nowrap text-warn-deep">
                {away}
              </span>
            )}
          </span>
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
    </li>
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

// A line along the person's top or bottom edge, where the one being dragged would go
const dropLine = {
  above: 'shadow-[inset_0_2px_0_var(--color-accent)]',
  below: 'shadow-[inset_0_-2px_0_var(--color-accent)]',
}
