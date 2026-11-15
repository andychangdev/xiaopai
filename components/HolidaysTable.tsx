'use client'

import { useRef, useState } from 'react'
import { addHoliday, removeHoliday, updateHoliday, type ActionResult } from '@/app/actions'
import type { HolidayListRow } from '@/lib/db/queries'
import { holidayDate } from '@/lib/roster/cost'
import type { IsoDate } from '@/lib/roster/dates'
import { sectionRefusal, tableScroll, td, th } from './Page'
import { UNREACHABLE } from './ShiftPopover'

const none = <span className="text-ink-3">—</span>

/**
 * Every public holiday, soonest first, with past ones greyed, each one
 * editable in place, and a row at the foot to add another.
 */
export function HolidaysTable({ holidays, today }: { holidays: HolidayListRow[]; today: IsoDate }) {
  const [error, setError] = useState<string>()
  const [editing, setEditing] = useState<number | null>(null)
  // The row last opened, whose Edit button takes focus back once it closes
  const [edited, setEdited] = useState<number>()

  function edit(id: number) {
    setEditing(id)
    setEdited(id)
  }

  async function remove(id: number) {
    setError((await removeHoliday(id).catch(() => ({ error: UNREACHABLE }))).error)
  }

  return (
    <>
      <div className={tableScroll}>
        <table className="w-full min-w-120 border-collapse">
          <thead>
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Name</th>
              <th className={th}>
                <span className="sr-only">Edit or remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {holidays.length ? (
              holidays.map((h) => {
                if (h.id === editing) {
                  return (
                    <HolidayRow
                      key={h.id}
                      form={`holiday-${h.id}`}
                      holiday={h}
                      submit="Save"
                      save={(input) => updateHoliday(h.id, input)}
                      setError={setError}
                      onClose={() => {
                        setEditing(null)
                        setError(undefined)
                      }}
                    />
                  )
                }
                const past = h.date < today
                const what = `${h.name ?? 'the public holiday'} on ${holidayDate(h.date)}`
                return (
                  <tr key={h.id} className={past ? 'text-ink-3' : ''}>
                    <td className={`${td} font-mono text-[12.5px]`}>
                      {holidayDate(h.date)}
                      {past && <span className="sr-only"> (past)</span>}
                    </td>
                    <td className={td}>{h.name ?? none}</td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      <button
                        className="text-link mr-3 text-ink-3 hover:text-ink focus-visible:text-ink"
                        aria-label={`Edit ${what}`}
                        autoFocus={h.id === edited}
                        onClick={() => edit(h.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-link text-ink-3 hover:text-crit-deep focus-visible:text-crit-deep"
                        aria-label={`Remove ${what}`}
                        onClick={() => remove(h.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={3} className={`${td} text-ink-3`}>
                  No public holidays yet.
                </td>
              </tr>
            )}
            <HolidayRow form="add-holiday" submit="Add" save={addHoliday} setError={setError} />
          </tbody>
        </table>
      </div>
      {error && (
        <p role="alert" className={sectionRefusal}>
          {error}
        </p>
      )}
    </>
  )
}

/**
 * A date and name to fill in: the foot's adds a holiday and empties, a
 * holiday's own saves it and closes. Esc or Cancel closes it unsaved.
 */
function HolidayRow({
  form,
  holiday,
  submit,
  save,
  setError,
  onClose,
}: {
  form: string
  holiday?: HolidayListRow
  submit: string
  save: (input: { date: string; name: string }) => Promise<ActionResult>
  setError: (error?: string) => void
  onClose?: () => void
}) {
  // A second Enter before the first save returns would save it twice
  const saving = useRef(false)

  return (
    <tr
      className="bg-surface-3"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose?.()
      }}
    >
      <td className={td}>
        <form
          id={form}
          onSubmit={async (e) => {
            e.preventDefault()
            if (saving.current) return
            saving.current = true
            const el = e.currentTarget
            const data = new FormData(el)
            try {
              const { error } = await save({
                date: String(data.get('date')),
                name: String(data.get('name')),
              }).catch(() => ({ error: UNREACHABLE }))
              setError(error)
              if (!error) {
                if (onClose) onClose()
                else el.reset()
              }
            } finally {
              saving.current = false
            }
          }}
        />
        <input
          form={form}
          name="date"
          type="date"
          defaultValue={holiday?.date}
          autoFocus={!!holiday}
          className="field font-mono"
          aria-label="Date of the public holiday"
        />
      </td>
      <td className={td}>
        <input
          form={form}
          name="name"
          defaultValue={holiday?.name ?? ''}
          className="field"
          aria-label="Name of the public holiday"
          placeholder="Name (optional)"
        />
      </td>
      <td className={`${td} text-right whitespace-nowrap`}>
        {onClose && (
          <button type="button" className="text-link mr-3 text-ink-3 hover:text-ink" onClick={onClose}>
            Cancel
          </button>
        )}
        <button form={form} type="submit" className="btn">
          {submit}
        </button>
      </td>
    </tr>
  )
}
