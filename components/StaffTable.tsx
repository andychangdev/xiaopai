'use client'

import { useOptimistic, useRef, useState, useTransition } from 'react'
import { addStaff, moveStaff, removeStaff, updateStaff, type ActionResult } from '@/app/actions'
import type { StaffListRow } from '@/lib/db/queries'
import { whyNotRemovable } from '@/lib/roster/staff'
import { td, th } from './Page'
import { SaveOnBlur } from './SaveOnBlur'
import { useAsk, type AskOptions } from './useAsk'

const hoursField = 'field w-[74px] font-mono tabular-nums'

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
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Expected hours</th>
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
        <p role="alert" className="border-t border-line px-3.5 py-2.5 text-[12.5px] text-crit">
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

  const save = async (patch: Parameters<typeof updateStaff>[1]) => report(await updateStaff(person.id, patch))

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
        <button className="text-link text-crit" onClick={remove}>
          Remove
        </button>
      </td>
    </tr>
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
