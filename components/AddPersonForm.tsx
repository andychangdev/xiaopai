'use client'

import { useEffect, useRef, useState } from 'react'
import { addStaff } from '@/app/actions'
import { UNREACHABLE } from './ShiftPopover'

const label = 'grid gap-1 text-[11.5px] font-semibold text-ink-2'
const numberField = 'field font-mono tabular-nums'

/**
 * Adding someone: a name at least, and anything else you know, then they
 * join the end of the order. Like booking leave, it opens over the list and
 * is done once they're in. Esc or Cancel gives up.
 */
export function AddPersonForm({ onDone }: { onDone: () => void }) {
  const nameRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()
  // A second Enter before the first add returns would add the person twice
  const adding = useRef(false)

  useEffect(() => nameRef.current?.focus(), [])

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
        if (adding.current) return
        adding.current = true
        const data = new FormData(e.currentTarget)
        try {
          const { error } = await addStaff({
            name: String(data.get('name')),
            expectedHours: String(data.get('expectedHours')),
            hourlyRate: String(data.get('hourlyRate')),
            notes: String(data.get('notes')),
          }).catch(() => ({ error: UNREACHABLE }))
          setError(error)
          if (error) nameRef.current?.focus()
          else onDone()
        } finally {
          adding.current = false
        }
      }}
    >
      <label className={label}>
        Name
        <input ref={nameRef} name="name" className="field" autoComplete="off" />
      </label>
      <div className="grid grid-cols-2 gap-2.5">
        <label className={label}>
          Expected hours / week
          <input name="expectedHours" className={numberField} inputMode="numeric" placeholder="—" />
        </label>
        <label className={label}>
          Hourly rate
          <input name="hourlyRate" className={numberField} inputMode="decimal" placeholder="—" />
        </label>
      </div>
      <label className={label}>
        Notes
        <input name="notes" className="field" placeholder="Optional" />
      </label>
      {error && (
        <p role="alert" className="text-[12.5px] text-crit-deep">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-[11.5px] text-ink-3">
          They join the end of the order, usually available every day. Click them afterwards to change that.
        </span>
        <button type="button" className="btn" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Add person
        </button>
      </div>
    </form>
  )
}
