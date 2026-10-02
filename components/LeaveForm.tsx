'use client'

import { useEffect, useRef, useState } from 'react'
import { leaveDays, parseLeave } from '@/lib/roster/leave'

const label = 'grid gap-1 text-[11.5px] font-semibold text-ink-2'

/**
 * Booking leave: from, to (the same day unless you say otherwise) and why.
 * With `staff` it asks who's away too. With `leave` it's that booking being
 * changed, in the panel: it starts filled in, has no box of its own, and
 * saves rather than books. `onSave` says whether it went in; once it has,
 * the form is done. Esc or Cancel gives up.
 */
export function LeaveForm({
  staff,
  leave,
  onSave,
  onDone,
}: {
  /** Who it could be for, when the form has to ask */
  staff?: { id: number; name: string }[]
  /** The booking being changed */
  leave?: { fromDate: string; toDate: string; note: string | null }
  onSave: (booking: { staffId: number | null; from: string; to: string; note: string }) => Promise<boolean>
  onDone: () => void
}) {
  const [from, setFrom] = useState(leave?.fromDate ?? '')
  const [to, setTo] = useState(leave?.toDate ?? '')
  const first = useRef<HTMLSelectElement & HTMLInputElement>(null)
  // A second Enter before the first save returns would book it twice
  const saving = useRef(false)
  const parsed = parseLeave({ from, to, note: '' })
  const days = 'error' in parsed ? null : leaveDays(parsed)

  useEffect(() => first.current?.focus(), [])

  return (
    <form
      className={`grid gap-2.5 ${leave ? '' : 'rounded-control border border-line bg-surface-3 p-2.5'}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onDone()
        }
      }}
      onSubmit={async (e) => {
        e.preventDefault()
        if (saving.current) return
        saving.current = true
        const data = new FormData(e.currentTarget)
        try {
          const staffId = staff ? Number(data.get('staffId')) || null : null
          if (await onSave({ staffId, from, to, note: String(data.get('note')) })) onDone()
        } finally {
          saving.current = false
        }
      }}
    >
      {staff && (
        <label className={label}>
          Who
          <select ref={first} name="staffId" className="field" defaultValue="">
            <option value="" disabled>
              Who&apos;s away?
            </option>
            {staff.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <label className={label}>
          First day
          <input
            ref={staff ? undefined : first}
            type="date"
            className="field font-mono"
            value={from}
            onChange={(e) => {
              const day = e.target.value
              setFrom(day)
              // The last day starts as the first and follows it while they match,
              // so moving a one-day booking keeps it one day. It never falls behind.
              if (!to || to === from || to < day) setTo(day)
            }}
          />
        </label>
        <label className={label}>
          Last day
          <input
            type="date"
            className="field font-mono"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <label className={label}>
        Reason
        <input name="note" className="field" placeholder="Optional" defaultValue={leave?.note ?? ''} />
      </label>
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto font-mono text-[12px] text-ink-3 tabular-nums">
          {days !== null && `${days} ${days === 1 ? 'day' : 'days'}`}
        </span>
        <button type="button" className="btn" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {leave ? 'Save' : 'Book leave'}
        </button>
      </div>
    </form>
  )
}
