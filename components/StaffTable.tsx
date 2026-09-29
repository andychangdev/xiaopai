'use client'

import { useOptimistic, useRef, useState, useTransition } from 'react'
import { addStaff, moveStaff, removeStaff, setAvailable, updateStaff, type ActionResult } from '@/app/actions'
import type { StaffListRow } from '@/lib/db/queries'
import { withDayAvailable } from '@/lib/roster/availability'
import { DAY_NAMES } from '@/lib/roster/dates'
import { whyNotRemovable } from '@/lib/roster/staff'
import { td, th } from './Page'
import { SaveOnBlur } from './SaveOnBlur'
import { UNREACHABLE } from './ShiftPopover'
import { useAsk, type AskOptions } from './useAsk'

const hoursField = 'field w-18.5 font-mono tabular-nums'

/** Returns the refusal, if there was one, so a box can put its old value back. */
type Report = (result: ActionResult) => string | undefined

export function StaffTable({ staff }: { staff: StaffListRow[] }) {
  const [dialog, ask] = useAsk()
  const [error, setError] = useState<string>()

  // Every save reports back; the last refusal shows under the table
  const report: Report = (result) => {
    setError(result.error)
    return result.error
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-190 border-collapse">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Expected hours</th>
              <th className={th}>Available</th>
              <th className={th}>Notes</th>
              <th className={th}>Active</th>
              <th className={th}>
                <span className="sr-only">Order and remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((person, i) => (
              <StaffRow
                key={person.id}
                person={person}
                first={i === 0}
                last={i === staff.length - 1}
                report={report}
                ask={ask}
              />
            ))}
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

function StaffRow({
  person,
  first,
  last,
  report,
  ask,
}: {
  person: StaffListRow
  first: boolean
  last: boolean
  report: Report
  ask: (options: AskOptions) => Promise<boolean>
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
    <tr className={active ? '' : 'text-ink-3'}>
      <td className={td}>
        <SaveOnBlur className="field" aria-label="Name" value={person.name} onSave={(name) => save({ name })} />
      </td>
      <td className={td}>
        <SaveOnBlur
          className={hoursField}
          aria-label="Expected weekly hours"
          inputMode="numeric"
          placeholder="—"
          value={person.expectedHours?.toString() ?? ''}
          onSave={(expectedHours) => save({ expectedHours })}
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
        <span className="mr-2.5 inline-flex gap-1.5">
          <OrderButton label="Move up" disabled={first} onClick={async () => report(await moveStaff(person.id, -1))}>
            ↑
          </OrderButton>
          <OrderButton label="Move down" disabled={last} onClick={async () => report(await moveStaff(person.id, 1))}>
            ↓
          </OrderButton>
        </span>
        <button className="text-link text-crit-deep" onClick={remove}>
          Remove
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
            className={`size-5.75 rounded-chip border text-[11px] leading-none font-semibold ${on ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface-3 text-ink-3 hover:border-line-strong'}`}
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

function OrderButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="text-[14px] leading-none text-ink-3 hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  )
}

/** The last row: a new person, active, at the bottom of the order. */
function AddRow({
  onAdd,
}: {
  onAdd: (input: { name: string; expectedHours: string; notes: string }) => Promise<string | undefined>
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
          className={hoursField}
          aria-label="Their expected weekly hours"
          inputMode="numeric"
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
