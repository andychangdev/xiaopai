'use client'

import { useEffect, useOptimistic, useRef, useState, useTransition, type ReactNode } from 'react'
import { addStaff, removeStaff, setAvailable, updateStaff, type ActionResult } from '@/app/actions'
import type { LeaveListRow, StaffListRow } from '@/lib/db/queries'
import { withDayAvailable } from '@/lib/roster/availability'
import { formatRate } from '@/lib/roster/cost'
import { DAY_NAMES, type IsoDate } from '@/lib/roster/dates'
import { isPast, leaveDays, leaveSpan } from '@/lib/roster/leave'
import { whyNotRemovable } from '@/lib/roster/staff'
import { BookLeaveForm } from './BookLeaveForm'
import { CrossIcon } from './Icons'
import { SaveOnBlur } from './SaveOnBlur'
import { UNREACHABLE } from './ShiftPopover'
import { useAsk } from './useAsk'
import { useLeave } from './useLeave'

const label = 'grid gap-1 text-[11.5px] font-semibold text-ink-2'
const numberField = 'field font-mono tabular-nums'

/** Returns the refusal, if there was one, so a box can put its old value back. */
type Report = (result: ActionResult) => string | undefined

/**
 * Everything about one person, beside the Staff page's list or, on a narrow
 * screen, as a sheet over it. Each box saves as you leave it and each toggle
 * as you press it, as the old table did. Esc, × or a click outside closes it.
 */
export function StaffPanel({
  person,
  leave,
  today,
  onClose,
  onDismiss,
  onAdded,
}: {
  /** Who it's for, or 'new' while adding someone */
  person: StaffListRow | 'new'
  /** Their bookings, soonest first */
  leave: LeaveListRow[]
  today: IsoDate
  /** Closed with Esc or × */
  onClose: () => void
  /** Closed by a click somewhere else, which keeps the focus it gives */
  onDismiss: () => void
  /** Someone new is on the list, so their own panel can open */
  onAdded: (id: number) => void
}) {
  const ref = useRef<HTMLElement>(null)
  const [error, setError] = useState<string>()
  // Every save reports back; the last refusal shows at the foot of the panel
  const report: Report = (result) => {
    setError(result.error)
    return result.error
  }

  // A click anywhere else closes it, though not one that opens someone (their
  // line, a leave bar, Add person), which moves it on to them instead. A box
  // being typed in is left first, so what's in it saves.
  useEffect(() => {
    const away = (e: PointerEvent) => {
      const target = e.target as Element
      if (ref.current?.contains(target) || target.closest?.('[data-keeps-panel]')) return
      const typing = document.activeElement
      if (typing instanceof HTMLElement && ref.current?.contains(typing)) typing.blur()
      onDismiss()
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [onDismiss])

  // Coming in, focus comes too, unless a box in it has already taken it
  useEffect(() => {
    const box = ref.current
    if (box && !box.contains(document.activeElement)) box.focus({ preventScroll: true })
  }, [])

  return (
    <>
      {/* The sheet's backdrop, which a click closes like anywhere else; beside the list there's none */}
      <div aria-hidden className="fixed inset-0 z-50 bg-scrim lg:hidden" />
      <section
        ref={ref}
        tabIndex={-1}
        aria-label={person === 'new' ? 'New person' : person.name}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t border-line-strong bg-surface pb-[env(safe-area-inset-bottom)] shadow-dialog outline-none lg:sticky lg:top-4 lg:z-auto lg:mt-13 lg:max-h-[calc(100dvh-32px)] lg:rounded-card lg:border lg:border-line lg:pb-0 lg:shadow-popover"
        onKeyDown={(e) => {
          // In a box, Esc abandons the edit; in a dialog, it answers no
          const target = e.target as HTMLElement
          if (e.key !== 'Escape' || target.closest('input, select, textarea, dialog')) return
          onClose()
        }}
      >
        <div aria-hidden className="mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong lg:hidden" />
        {person === 'new' ? (
          <NewPerson report={report} onClose={onClose} onAdded={onAdded} />
        ) : (
          <Person person={person} leave={leave} today={today} report={report} onClose={onClose} />
        )}
        {error && (
          <p role="alert" className="border-t border-line px-3.5 py-2.5 text-[12.5px] text-crit-deep">
            {error}
          </p>
        )}
      </section>
    </>
  )
}

function Head({ title, onClose, children }: { title: string; onClose: () => void; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-3.5 py-3">
      <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</h2>
      {children}
      <button
        aria-label="Close"
        title="Close (Esc)"
        className="grid size-7 place-items-center rounded-control text-ink-3 hover:bg-surface-2 hover:text-ink"
        onClick={onClose}
      >
        <CrossIcon />
      </button>
    </div>
  )
}

function Person({
  person,
  leave,
  today,
  report,
  onClose,
}: {
  person: StaffListRow
  leave: LeaveListRow[]
  today: IsoDate
  report: Report
  onClose: () => void
}) {
  const [dialog, ask] = useAsk()
  // The switch flips the moment you press it, rather than when the server answers
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
    if (!yes) return
    if (!report(await removeStaff(person.id).catch(() => ({ error: UNREACHABLE })))) onClose()
  }

  return (
    <>
      <Head title={person.name} onClose={onClose}>
        <button
          role="switch"
          aria-checked={active}
          title={active ? 'On every new week. Switch off to take them off new weeks' : 'Off new weeks. Switch on to roster them again'}
          className="inline-flex items-center gap-2 text-[12.5px] text-ink-2"
          onClick={() =>
            startTransition(async () => {
              setActive(!active)
              await save({ active: !active })
            })
          }
        >
          <span
            aria-hidden
            className={`relative h-4 w-7 rounded-full transition-colors ${active ? 'bg-accent' : 'bg-line-strong'}`}
          >
            <span
              className={`absolute top-0.5 size-3 rounded-full bg-surface transition-[left] ${active ? 'left-3.5' : 'left-0.5'}`}
            />
          </span>
          Active
        </button>
      </Head>
      <div className="grid gap-3.5 px-3.5 py-3.5">
        <label className={label}>
          Name
          <SaveOnBlur className="field" value={person.name} onSave={(name) => save({ name })} />
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <label className={label}>
            Expected hours / week
            <SaveOnBlur
              className={numberField}
              inputMode="numeric"
              placeholder="—"
              value={person.expectedHours?.toString() ?? ''}
              onSave={(expectedHours) => save({ expectedHours })}
            />
          </label>
          <label className={label}>
            Hourly rate
            <SaveOnBlur
              className={numberField}
              inputMode="decimal"
              placeholder="—"
              value={person.hourlyRate === null ? '' : formatRate(person.hourlyRate)}
              onSave={(hourlyRate) => save({ hourlyRate })}
            />
          </label>
        </div>
        <div className={label}>
          <span id={`available-${person.id}`}>Usually available</span>
          <AvailableDays id={person.id} available={person.available} report={report} />
        </div>
        <label className={label}>
          Notes
          <SaveOnBlur className="field" placeholder="Optional" value={person.notes ?? ''} onSave={(notes) => save({ notes })} />
        </label>
        <p className="text-[11.5px] leading-snug text-ink-3">
          Rostering them on a day they aren&apos;t usually available warns, but is never blocked. Switching Active off
          takes them off new weeks and leaves any week they already have shifts on.
        </p>
        <PersonLeave person={person} leave={leave} today={today} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line px-3.5 py-2.5">
        <button className="text-link text-crit-deep" onClick={remove}>
          Remove {person.name}
        </button>
        <span className="text-[11px] text-ink-3">Only for someone with no shifts or leave</span>
      </div>
      {dialog}
    </>
  )
}

/**
 * Their leave still to come or under way, soonest first, each one
 * cancellable, and a form to book more for them. Leave blocks rostering, so
 * the question about shifts already there comes up as it does anywhere.
 */
function PersonLeave({ person, leave, today }: { person: StaffListRow; leave: LeaveListRow[]; today: IsoDate }) {
  const [error, setError] = useState<string>()
  const [dialog, book, cancel] = useLeave(setError)
  const [booking, setBooking] = useState(false)
  const ahead = leave.filter((l) => !isPast(l, today))

  return (
    <div className="grid gap-2 border-t border-line pt-3.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[11.5px] font-semibold text-ink-2">Leave</h3>
        {person.active && !booking && (
          <button className="btn px-2.5 py-1 text-[12px]" onClick={() => setBooking(true)}>
            Book leave
          </button>
        )}
      </div>
      {ahead.length > 0 && (
        <ul className="rounded-control border border-line">
          {ahead.map((l) => {
            const days = leaveDays(l)
            return (
              <li key={l.id} className="flex items-center justify-between gap-3 border-b border-line px-2.5 py-1.75 last:border-b-0">
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium">{leaveSpan(l)}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">
                    {[l.note, `${days} ${days === 1 ? 'day' : 'days'}`].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <button
                  className="text-link text-ink-3 hover:text-crit-deep focus-visible:text-crit-deep"
                  aria-label={`Cancel ${person.name}'s leave, ${leaveSpan(l)}`}
                  onClick={() => cancel(l)}
                >
                  Cancel
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {!ahead.length && !booking && <p className="text-[12px] text-ink-3">No leave booked.</p>}
      {booking && (
        <BookLeaveForm
          onBook={(b) => book({ ...b, staffId: person.id }, person.name)}
          onDone={() => setBooking(false)}
        />
      )}
      {!person.active && <p className="text-[11.5px] text-ink-3">Switch Active on to book leave for them.</p>}
      {error && (
        <p role="alert" className="text-[12.5px] text-crit-deep">
          {error}
        </p>
      )}
      {dialog}
    </div>
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
    <span role="group" aria-labelledby={`available-${id}`} className="flex gap-1">
      {DAY_NAMES.map((day, weekday) => {
        const on = days[weekday]
        return (
          <button
            key={day}
            aria-label={day}
            aria-pressed={on}
            title={`${on ? 'Usually available' : 'Not usually available'} on ${day}`}
            className={`size-7 rounded-chip border text-[11.5px] leading-none font-semibold ${on ? 'highlight' : 'border-line bg-surface-3 text-ink-3 hover:border-line-strong'}`}
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

/** Someone new: a name at least, and anything else you know, then they join the end of the order. */
function NewPerson({ report, onClose, onAdded }: { report: Report; onClose: () => void; onAdded: (id: number) => void }) {
  const nameRef = useRef<HTMLInputElement>(null)
  // A second Enter before the first add returns would add the person twice
  const adding = useRef(false)

  useEffect(() => nameRef.current?.focus(), [])

  return (
    <>
      <Head title="New person" onClose={onClose} />
      <form
        className="grid gap-3.5 px-3.5 py-3.5"
        onSubmit={async (e) => {
          e.preventDefault()
          if (adding.current) return
          adding.current = true
          const data = new FormData(e.currentTarget)
          try {
            const result = await addStaff({
              name: String(data.get('name')),
              expectedHours: String(data.get('expectedHours')),
              hourlyRate: String(data.get('hourlyRate')),
              notes: String(data.get('notes')),
            }).catch(() => ({ error: UNREACHABLE, id: undefined }))
            if (!report(result) && result.id !== undefined) onAdded(result.id)
            else nameRef.current?.focus()
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
        <p className="text-[11.5px] leading-snug text-ink-3">
          They join the end of the order, usually available every day. Change either once they&apos;re added.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Add person
          </button>
        </div>
      </form>
    </>
  )
}
