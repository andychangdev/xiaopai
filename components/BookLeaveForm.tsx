'use client'

import { useEffect, useRef, useState } from 'react'
import { leaveDays, parseLeave } from '@/lib/roster/leave'

const label = 'grid gap-1 text-[11.5px] font-semibold text-ink-2'

/**
 * Booking leave: from, to (the same day unless you say otherwise) and why.
 * With `staff` it asks who's away too. `onBook` says whether it went in;
 * once it has, the form is done. Esc or Cancel gives up.
 */
export function BookLeaveForm({
  staff,
  onBook,
  onDone,
}: {
  /** Who it could be for, when the form has to ask */
  staff?: { id: number; name: string }[]
  onBook: (booking: { staffId: number | null; from: string; to: string; note: string }) => Promise<boolean>
  onDone: () => void
}) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const first = useRef<HTMLSelectElement & HTMLInputElement>(null)
  // A second Enter before the first booking returns would book it twice
  const booking = useRef(false)
  const parsed = parseLeave({ from, to, note: '' })
  const days = 'error' in parsed ? null : leaveDays(parsed)

  useEffect(() => first.current?.focus(), [])

  return (
    <form
      className="grid gap-2.5 rounded-control border border-line bg-surface-3 p-2.5"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onDone()
        }
      }}
      onSubmit={async (e) => {
        e.preventDefault()
        if (booking.current) return
        booking.current = true
        const data = new FormData(e.currentTarget)
        try {
          const staffId = staff ? Number(data.get('staffId')) || null : null
          if (await onBook({ staffId, from, to, note: String(data.get('note')) })) onDone()
        } finally {
          booking.current = false
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
        <input name="note" className="field" placeholder="Optional" />
      </label>
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto font-mono text-[12px] text-ink-3 tabular-nums">
          {days !== null && `${days} ${days === 1 ? 'day' : 'days'}`}
        </span>
        <button type="button" className="btn" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Book leave
        </button>
      </div>
    </form>
  )
}
