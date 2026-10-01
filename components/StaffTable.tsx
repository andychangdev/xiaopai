'use client'

import { useOptimistic, useRef, useState, useTransition } from 'react'
import { addStaff, moveStaff, removeStaff, setAvailable, updateStaff, type ActionResult } from '@/app/actions'
import type { StaffListRow } from '@/lib/db/queries'
import { withDayAvailable } from '@/lib/roster/availability'
import { formatRate } from '@/lib/roster/cost'
import { DAY_NAMES } from '@/lib/roster/dates'
import { moveInOrder, whyNotRemovable } from '@/lib/roster/staff'
import { GripIcon } from './Icons'
import { tableScroll, td, th } from './Page'
import { SaveOnBlur } from './SaveOnBlur'
import { UNREACHABLE } from './ShiftPopover'
import { useAsk, type AskOptions } from './useAsk'

const numberField = 'field w-18.5 font-mono tabular-nums'

/** Returns the refusal, if there was one, so a box can put its old value back. */
type Report = (result: ActionResult) => string | undefined

export function StaffTable({ staff }: { staff: StaffListRow[] }) {
  const [dialog, ask] = useAsk()
  const [error, setError] = useState<string>()
  // A row moves the moment it's dropped, rather than when the server answers
  const [rows, reorder] = useOptimistic(staff, (rows, to: { id: number; place: number }) =>
    moveInOrder(rows, to.id, to.place),
  )
  const [, startTransition] = useTransition()

  // Every save reports back; the last refusal shows under the table
  const report: Report = (result) => {
    setError(result.error)
    return result.error
  }

  function move(id: number, place: number) {
    startTransition(async () => {
      reorder({ id, place })
      report(await moveStaff(id, place).catch(() => ({ error: UNREACHABLE })))
    })
  }

  const [dragging, setDragging] = useState<number | null>(null)
  // The gap a drop would land in, 0 above the first row, so it can show it
  const [gap, setGap] = useState<number | null>(null)
  const dragFrame = useRef(0)
  const from = rows.findIndex((p) => p.id === dragging)
  // Either side of the row being dragged is where it already is
  const shownGap = gap === from || gap === from + 1 ? null : gap

  function startDrag(id: number) {
    // A frame later, once the browser has its picture of the row, which would otherwise be the dimmed one
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
    // Once the row's out, every gap below it is a place higher
    move(rows[from].id, shownGap > from ? shownGap - 1 : shownGap)
  }

  return (
    <>
      <div className={tableScroll}>
        <table className="w-full min-w-205 border-collapse">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Expected hours</th>
              <th className={th}>Hourly rate</th>
              <th className={th}>Available</th>
              <th className={th}>Notes</th>
              <th className={th}>Active</th>
              <th className={th}>
                <span className="sr-only">Remove and reorder</span>
              </th>
            </tr>
          </thead>
          <tbody
            onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setGap(null)}
            // Only while a row's being dragged, so text still drops into the boxes
            onDrop={
              dragging !== null
                ? (e) => {
                    e.preventDefault()
                    drop()
                  }
                : undefined
            }
          >
            {rows.map((person, i) => (
              <StaffRow
                key={person.id}
                person={person}
                report={report}
                ask={ask}
                dragged={person.id === dragging}
                drop={shownGap === i ? 'above' : shownGap === rows.length && i === rows.length - 1 ? 'below' : undefined}
                onDragStart={() => startDrag(person.id)}
                onDragEnd={endDrag}
                onDragOver={dragging !== null ? (below) => setGap(below ? i + 1 : i) : undefined}
                onMove={(by) => {
                  const place = i + by
                  if (place >= 0 && place < rows.length) move(person.id, place)
                }}
              />
            ))}
          </tbody>
          {/* Its own body, so dragging onto it leaves the rows */}
          <tbody>
            <AddRow onAdd={async (input) => report(await addStaff(input))} />
          </tbody>
        </table>
      </div>
      {error && (
        <p role="alert" className="border-t border-line px-3.5 py-2.5 text-[12.5px] text-crit-deep">
          {error}
        </p>
      )}
      {dialog}
    </>
  )
}

/**
 * The handle at the end drags the row to another place in the order. While
 * one's being dragged, a line shows where it would land. With the handle
 * focused, the arrow keys move it a place at a time.
 */
function StaffRow({
  person,
  report,
  ask,
  dragged,
  drop,
  onDragStart,
  onDragEnd,
  onDragOver,
  onMove,
}: {
  person: StaffListRow
  report: Report
  ask: (options: AskOptions) => Promise<boolean>
  /** Being dragged, wherever the pointer is */
  dragged: boolean
  /** Which edge the line goes on, when a drop would land next to this row */
  drop?: 'above' | 'below'
  onDragStart: () => void
  onDragEnd: () => void
  /** While a row's being dragged, whether the pointer's over this one's lower half */
  onDragOver?: (below: boolean) => void
  /** A place up (-1) or down (1), from the arrow keys */
  onMove: (by: -1 | 1) => void
}) {
  // The box ticks the moment you click, rather than when the server answers
  const [active, setActive] = useOptimistic(person.active)
  const [, startTransition] = useTransition()

  const save = async (patch: Parameters<typeof updateStaff>[1]) =>
    report(await updateStaff(person.id, patch).catch(() => ({ error: UNREACHABLE })))

  async function remove() {
    const reason = whyNotRemovable(person, person.history)
    if (reason) {
      await ask({ title: `Can't remove ${person.name}`, body: reason, ok: 'OK', cancel: null })
      return
    }
    const notes = person.history.naNotes
    const yes = await ask({
      title: `Remove ${person.name}?`,
      body:
        "They've never had a shift or booked leave. " +
        (notes ? `Their ${notes === 1 ? 'N/A note goes' : `${notes} N/A notes go`} too.` : 'Nothing else changes.'),
      ok: 'Remove',
      danger: true,
    })
    if (yes) report(await removeStaff(person.id))
  }

  return (
    <tr
      className={`${active ? '' : 'text-ink-3'} ${dragged ? 'opacity-40' : ''} ${drop ? dropLine[drop] : ''}`}
      onDragOver={
        onDragOver &&
        ((e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          const { top, height } = e.currentTarget.getBoundingClientRect()
          onDragOver(e.clientY > top + height / 2)
        })
      }
    >
      <td className={td}>
        <SaveOnBlur className="field" aria-label="Name" value={person.name} onSave={(name) => save({ name })} />
      </td>
      <td className={td}>
        <SaveOnBlur
          className={numberField}
          aria-label="Expected weekly hours"
          inputMode="numeric"
          placeholder="—"
          value={person.expectedHours?.toString() ?? ''}
          onSave={(expectedHours) => save({ expectedHours })}
        />
      </td>
      <td className={td}>
        <SaveOnBlur
          className={numberField}
          aria-label="Hourly rate"
          inputMode="decimal"
          placeholder="—"
          value={person.hourlyRate === null ? '' : formatRate(person.hourlyRate)}
          onSave={(hourlyRate) => save({ hourlyRate })}
        />
      </td>
      <td className={td}>
        <AvailableDays id={person.id} available={person.available} report={report} />
      </td>
      <td className={td}>
        <SaveOnBlur
          className="field"
          aria-label="Notes"
          placeholder="Optional"
          value={person.notes ?? ''}
          onSave={(notes) => save({ notes })}
        />
      </td>
      <td className={td}>
        <label className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
          <input
            type="checkbox"
            className="accent-accent"
            checked={active}
            onChange={(e) => {
              const checked = e.target.checked
              startTransition(async () => {
                setActive(checked)
                await save({ active: checked })
              })
            }}
          />
          {active ? 'Active' : 'Inactive'}
        </label>
      </td>
      <td className={`${td} text-right whitespace-nowrap`}>
        <button className="text-link text-crit-deep" onClick={remove}>
          Remove
        </button>
        <button
          draggable
          aria-label={`Move ${person.name} up or down, with the arrow keys`}
          title="Drag to reorder, or use the arrow keys"
          className="ml-3 inline-grid cursor-grab place-items-center align-middle text-ink-3 hover:text-ink"
          onDragStart={(e) => {
            // The whole row goes with the pointer, not just the handle
            const row = e.currentTarget.closest('tr')!
            const { left, top } = row.getBoundingClientRect()
            e.dataTransfer.setDragImage(row, e.clientX - left, e.clientY - top)
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', person.name)
            onDragStart()
          }}
          onDragEnd={onDragEnd}
          onKeyDown={(e) => {
            const by = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
            if (!by) return
            e.preventDefault() // rather than scroll the page
            onMove(by)
          }}
        >
          <GripIcon />
        </button>
      </td>
    </tr>
  )
}

/** The weekdays someone can usually work, each a toggle that saves when pressed. */
function AvailableDays({ id, available, report }: { id: number; available: boolean[]; report: Report }) {
  // Lit the moment you press it, rather than when the server answers
  const [days, setDay] = useOptimistic(available, (days, change: { weekday: number; on: boolean }) =>
    withDayAvailable(days, change.weekday, change.on),
  )
  const [, startTransition] = useTransition()

  return (
    <span role="group" aria-label="Usually available" className="inline-flex gap-0.75">
      {DAY_NAMES.map((day, weekday) => {
        const on = days[weekday]
        return (
          <button
            key={day}
            aria-label={day}
            aria-pressed={on}
            title={`${on ? 'Usually available' : 'Not usually available'} on ${day}`}
            className={`size-5.75 rounded-chip border text-[11px] leading-none font-semibold ${on ? 'border-accent-line bg-accent-bg text-accent-deep' : 'border-line bg-surface-3 text-ink-3 hover:border-line-strong'}`}
            onClick={() =>
              startTransition(async () => {
                setDay({ weekday, on: !on })
                report(await setAvailable(id, weekday, !on).catch(() => ({ error: UNREACHABLE })))
              })
            }
          >
            {day[0]}
          </button>
        )
      })}
    </span>
  )
}

// A line along the row's edge, drawn on its cells since not every browser shadows a tr
const dropLine = {
  above: '[&>td]:shadow-[inset_0_2px_0_var(--color-accent)]',
  below: '[&>td]:shadow-[inset_0_-2px_0_var(--color-accent)]',
}

/** The last row: a new person, active, at the bottom of the order. */
function AddRow({
  onAdd,
}: {
  onAdd: (input: {
    name: string
    expectedHours: string
    hourlyRate: string
    notes: string
  }) => Promise<string | undefined>
}) {
  const form = 'add-staff'
  const nameRef = useRef<HTMLInputElement>(null)
  // A second Enter before the first add returns would add the person twice
  const adding = useRef(false)

  return (
    <tr className="bg-surface-3">
      <td className={td}>
        <form
          id={form}
          onSubmit={async (e) => {
            e.preventDefault()
            if (adding.current) return
            adding.current = true
            const el = e.currentTarget
            const data = new FormData(el)
            try {
              const refused = await onAdd({
                name: String(data.get('name')),
                expectedHours: String(data.get('expectedHours')),
                hourlyRate: String(data.get('hourlyRate')),
                notes: String(data.get('notes')),
              })
              if (!refused) el.reset()
            } finally {
              adding.current = false
            }
            nameRef.current?.focus()
          }}
        />
        <input
          ref={nameRef}
          form={form}
          name="name"
          className="field"
          aria-label="New staff member's name"
          placeholder="New staff member"
        />
      </td>
      <td className={td}>
        <input
          form={form}
          name="expectedHours"
          className={numberField}
          aria-label="Their expected weekly hours"
          inputMode="numeric"
          placeholder="—"
        />
      </td>
      <td className={td}>
        <input
          form={form}
          name="hourlyRate"
          className={numberField}
          aria-label="Their hourly rate"
          inputMode="decimal"
          placeholder="—"
        />
      </td>
      <td className={`${td} text-[12px] text-ink-3`}>Every day</td>
      <td className={td}>
        <input form={form} name="notes" className="field" aria-label="Notes about them" placeholder="Optional" />
      </td>
      <td className={`${td} text-right`} colSpan={2}>
        <button form={form} type="submit" className="btn">
          Add
        </button>
      </td>
    </tr>
  )
}
