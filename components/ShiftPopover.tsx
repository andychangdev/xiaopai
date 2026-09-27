'use client'

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { addShift, removeShift, updateShift, type ActionResult } from '@/app/actions'
import { dayLabel, type IsoDate } from '@/lib/roster/dates'
import type { Shift } from '@/lib/roster/shifts'
import { firstName } from '@/lib/roster/staff'
import { formatRange, parseShorthand } from '@/lib/roster/time'

/** The cell a popover is for, and the shift in it when a chip opened it. */
export type PopoverTarget = {
  person: { id: number; name: string }
  date: IsoDate
  shift?: Shift
  anchor: HTMLElement
}

const GAP = 6
const MARGIN = 8

/** When a save never reached the server, or it failed there. */
export const UNREACHABLE = "Couldn't save. Check the app is still running, then try again."

/**
 * The small box that opens on a cell: type a range and press Enter to add a
 * shift, or, opened from a chip, change its times or remove it. Esc, Cancel
 * or a click anywhere else closes it without saving.
 */
export function ShiftPopover({
  week,
  target,
  onClose,
}: {
  week: IsoDate
  target: PopoverTarget
  onClose: (target: PopoverTarget) => void
}) {
  const { person, date, shift, anchor } = target
  const ref = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()
  // A second Enter before the first save returns would add the shift twice
  const saving = useRef(false)
  // Closed by a click elsewhere while a save was on its way
  const gone = useRef(false)

  // Below the cell, or above it if there's no room, kept inside the window.
  // It's fixed, so it's placed again whenever the cell moves (the grid
  // scrolls sideways) or the message under the box changes its height.
  useLayoutEffect(() => {
    const box = ref.current!
    function place() {
      const r = anchor.getBoundingClientRect()
      const { clientWidth: vw, clientHeight: vh } = document.documentElement // not counting scrollbars
      const { offsetWidth: w, offsetHeight: h } = box
      box.style.left = `${Math.max(MARGIN, Math.min(vw - w - MARGIN, r.left))}px`
      box.style.top = `${r.bottom + GAP + h + MARGIN > vh ? Math.max(MARGIN, r.top - GAP - h) : r.bottom + GAP}px`
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchor, error])

  useEffect(() => {
    gone.current = false // Strict Mode mounts twice
    input.current?.focus({ preventScroll: true })
    input.current?.select()
    return () => {
      gone.current = true
    }
  }, [])

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose(target)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [onClose, target])

  /** Closes, handing focus back to the cell like a dialog would. */
  function done(focus: HTMLElement | null | undefined = anchor) {
    onClose(target)
    if (focus?.isConnected) focus.focus()
  }

  // Focus goes to `then` afterwards. By default that's whatever opened this,
  // which survives the save; Remove passes the cell's add button instead.
  async function save(run: () => Promise<ActionResult>, then?: HTMLElement | null) {
    if (saving.current) return
    saving.current = true
    const error = await run().then(
      (result) => result.error,
      () => UNREACHABLE,
    )
    if (gone.current) return
    if (error) {
      saving.current = false
      refuse(error)
    } else {
      done(then) // saving stays set: this is closing, and mustn't save again
    }
  }

  function refuse(message: string) {
    setError(message)
    input.current?.select()
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const typed = input.current!.value
    // Left as it opened, it's the shift as it stands. Reading it again could
    // move one that starts before 7:00, since the shorthand takes that as the
    // afternoon.
    if (shift && typed === formatRange(shift.start, shift.end)) return done()
    const times = parseShorthand(typed)
    if ('error' in times) return refuse(times.error)
    if (!shift) return save(() => addShift({ week, staffId: person.id, date, ...times }))
    if (times.start === shift.start && times.end === shift.end) return done()
    return save(() => updateShift(shift.id, times))
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${shift ? 'Change shift' : 'Add a shift'} for ${person.name} on ${dayLabel(date)}`}
      className="fixed z-50 w-[250px] rounded-card border border-line-strong bg-surface p-[11px] shadow-popover"
      onKeyDown={(e) => {
        if (e.key === 'Escape') done()
      }}
      onBlur={(e) => {
        // Tabbing out closes it. Clicks elsewhere are the pointerdown's job.
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) onClose(target)
      }}
    >
      <h3 className="mb-[7px] text-[11px] font-semibold tracking-[0.09em] text-ink-3 uppercase">
        {firstName(person.name)} · {dayLabel(date)}
      </h3>
      <form className="flex gap-[5px]" onSubmit={submit}>
        <input
          ref={input}
          aria-label="Shift times"
          aria-invalid={!!error}
          aria-describedby="shift-popover-note"
          autoComplete="off"
          placeholder="10-18"
          defaultValue={shift ? formatRange(shift.start, shift.end) : ''}
          onChange={() => setError(undefined)}
          className="field min-w-0 flex-1 border-line-strong py-1.5 font-mono focus:border-accent"
        />
        <button type="submit" className="btn">
          {shift ? 'Save' : 'Add'}
        </button>
      </form>
      <p
        id="shift-popover-note"
        role={error ? 'alert' : undefined}
        className={`mt-[7px] text-[11px] ${error ? 'leading-snug text-crit' : 'font-mono text-ink-3'}`}
      >
        {error ?? '10-18 or 10-6 → 10:00–18:00'}
      </p>
      <div className="mt-[9px] flex gap-1.5 border-t border-line pt-[9px] [&>.btn]:flex-1 [&>.btn]:p-[5px] [&>.btn]:text-center [&>.btn]:text-[12px]">
        {shift && (
          <button
            className="btn btn-danger"
            onClick={() => {
              const addButton = anchor.closest('[data-cell]')?.querySelector<HTMLElement>('[data-add]')
              save(() => removeShift(shift.id), addButton)
            }}
          >
            Remove
          </button>
        )}
        <button className="btn" onClick={() => done()}>
          Cancel
        </button>
      </div>
    </div>
  )
}
