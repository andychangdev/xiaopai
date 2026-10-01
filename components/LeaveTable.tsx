'use client'

import { useRef, useState } from 'react'
import type { LeaveListRow } from '@/lib/db/queries'
import { dayLabel, type IsoDate } from '@/lib/roster/dates'
import { isPast, leaveDays, leaveSpan, parseLeave } from '@/lib/roster/leave'
import { tableScroll, td, th } from './Page'
import { useLeave, type Booking } from './useLeave'

/** Everyone's leave, soonest first, with past leave greyed and a row at the foot to book more. */
export function LeaveTable({
  leave,
  staff,
  today,
}: {
  leave: LeaveListRow[]
  /** Who leave can be booked for: everyone active */
  staff: { id: number; name: string }[]
  today: IsoDate
}) {
  const [error, setError] = useState<string>()
  const [dialog, bookLeave, cancel] = useLeave(setError)

  const book = (booking: Booking) => bookLeave(booking, staff.find((p) => p.id === booking.staffId)?.name ?? '')

  return (
    <>
      <div className={tableScroll}>
        <table className="w-full min-w-160 border-collapse">
          <thead>
            <tr>
              <th className={th}>Who</th>
              <th className={th}>From</th>
              <th className={th}>To</th>
              <th className={th}>Days</th>
              <th className={th}>Note</th>
              <th className={th}>
                <span className="sr-only">Cancel</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {leave.length ? (
              leave.map((l) => <LeaveRow key={l.id} leave={l} past={isPast(l, today)} onCancel={() => cancel(l)} />)
            ) : (
              <tr>
                <td colSpan={6} className={`${td} text-ink-3`}>
                  No leave booked.
                </td>
              </tr>
            )}
            <BookRow staff={staff} onBook={book} onRefuse={setError} />
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

const none = <span className="text-ink-3">—</span>

function LeaveRow({ leave: l, past, onCancel }: { leave: LeaveListRow; past: boolean; onCancel: () => void }) {
  return (
    <tr className={past ? 'text-ink-3' : ''}>
      <td className={`${td} font-semibold`}>
        {l.name}
        {past && <span className="sr-only"> (past)</span>}
      </td>
      <td className={`${td} font-mono text-[12.5px]`}>{dayLabel(l.fromDate)}</td>
      <td className={`${td} font-mono text-[12.5px]`}>{l.toDate === l.fromDate ? none : dayLabel(l.toDate)}</td>
      <td className={`${td} font-mono text-[12.5px] tabular-nums`}>{leaveDays(l)}</td>
      <td className={td}>{l.note ?? none}</td>
      <td className={`${td} text-right`}>
        <button className="text-link text-crit-deep" aria-label={`Cancel ${l.name}'s leave, ${leaveSpan(l)}`} onClick={onCancel}>
          Cancel
        </button>
      </td>
    </tr>
  )
}

/** The last row: who, from, to (the same day unless you say otherwise) and why. */
function BookRow({
  staff,
  onBook,
  onRefuse,
}: {
  staff: { id: number; name: string }[]
  onBook: (booking: Booking) => Promise<boolean>
  onRefuse: (message: string) => void
}) {
  const form = 'book-leave'
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  // A second Enter before the first booking returns would book it twice
  const booking = useRef(false)
  const parsed = parseLeave({ from, to, note: '' })

  return (
    <tr className="bg-surface-3">
      <td className={td}>
        <form
          id={form}
          onSubmit={async (e) => {
            e.preventDefault()
            if (booking.current) return
            const el = e.currentTarget
            const data = new FormData(el)
            const staffId = Number(data.get('staffId'))
            if (!staffId) return onRefuse("Pick who's away.")
            booking.current = true
            try {
              if (await onBook({ staffId, from, to, note: String(data.get('note')) })) {
                el.reset()
                setFrom('')
                setTo('')
              }
            } finally {
              booking.current = false
            }
          }}
        />
        <select form={form} name="staffId" className="field" aria-label="Who's away" defaultValue="">
          <option value="" disabled>
            Who&apos;s away?
          </option>
          {staff.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </td>
      <td className={td}>
        <input
          form={form}
          type="date"
          className="field font-mono"
          aria-label="First day away"
          value={from}
          onChange={(e) => {
            const day = e.target.value
            setFrom(day)
            // The last day starts as the first and follows it while they match,
            // so moving a one-day booking keeps it one day. It never falls behind.
            if (!to || to === from || to < day) setTo(day)
          }}
        />
      </td>
      <td className={td}>
        <input
          form={form}
          type="date"
          className="field font-mono"
          aria-label="Last day away"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
        />
      </td>
      <td className={`${td} font-mono text-[12.5px] text-ink-3 tabular-nums`}>
        {'error' in parsed ? '—' : leaveDays(parsed)}
      </td>
      <td className={td}>
        <input
          form={form}
          name="note"
          className="field"
          aria-label="Reason for the leave"
          placeholder="Reason (optional)"
        />
      </td>
      <td className={`${td} text-right`}>
        <button form={form} type="submit" className="btn">
          Book
        </button>
      </td>
    </tr>
  )
}
