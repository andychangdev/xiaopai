'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { addShift, removeShift, setMarkedNa, updateShift, type ActionResult } from '@/app/actions'
import type { Template } from '@/lib/db/queries'
import { dayLabel, type IsoDate } from '@/lib/roster/dates'
import { alreadyNaNote } from '@/lib/roster/notAvailable'
import type { Shift } from '@/lib/roster/shifts'
import { formatRange, parseShorthand, type Minutes } from '@/lib/roster/time'
import { Popover, type PopoverTarget } from './Popover'

/** When a save never reached the server, or it failed there. */
export const UNREACHABLE = "Couldn't save. Check the app is still running, then try again."

/** Why a server action didn't save, or undefined when it did. One that never arrived counts. */
export function actionError(run: () => Promise<ActionResult>): Promise<string | undefined> {
  return run().then(
    (result) => result.error,
    () => UNREACHABLE,
  )
}

/**
 * What opens on a cell: type a range and press Enter, or click a template, to
 * add a shift, or Mark N/A for this week (Clear N/A takes it off). Opened
 * from a chip, the same change its times, Remove takes it off, and Copy hands
 * it to the grid to paste into other cells. Esc, Cancel or a click anywhere
 * else closes it without saving.
 */
export function ShiftPopover({
  week,
  target,
  templates,
  onClose,
  onCopy,
}: {
  week: IsoDate
  target: PopoverTarget
  templates: Template[]
  onClose: (target: PopoverTarget) => void
  onCopy: (shift: Shift) => void
}) {
  const { person, date, na, shift, anchor } = target
  // Their pattern already says so, and a note on top would say nothing new
  const alreadyNa = !shift && na === 'usual'
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()
  // A second Enter before the first save returns would add the shift twice
  const saving = useRef(false)
  // Closed by a click elsewhere while a save was on its way
  const gone = useRef(false)

  useEffect(() => {
    gone.current = false // Strict Mode mounts twice
    input.current?.focus({ preventScroll: true })
    input.current?.select()
    return () => {
      gone.current = true
    }
  }, [])

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
    const error = await actionError(run)
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

  /** Adds a shift with these times, or moves the chip's shift to them. */
  function saveTimes(times: { start: Minutes; end: Minutes }) {
    const { start, end } = times
    if (!shift) return save(() => addShift({ week, staffId: person.id, date, start, end }))
    if (start === shift.start && end === shift.end) return done()
    return save(() => updateShift(shift.id, { start, end }))
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
    return saveTimes(times)
  }

  return (
    <Popover
      target={target}
      label={`${shift ? 'Change shift' : 'Add a shift'} for ${person.name} on ${dayLabel(date)}`}
      onClose={onClose}
    >
      {templates.length > 0 && (
        <div className="mb-2.5 grid grid-cols-2 gap-[5px]">
          {templates.map((t) => {
            const times = formatRange(t.start, t.end)
            return (
              <button
                key={t.id}
                aria-label={`${shift ? 'Change to' : 'Add'} ${t.name}, ${times}`}
                className="min-w-0 rounded-chip border border-line bg-surface-3 px-[7px] py-1.5 text-left hover:border-accent hover:bg-surface-2"
                onClick={() => saveTimes(t)}
              >
                <span className="block text-[12px] font-semibold wrap-break-word">{t.name}</span>
                <span className="font-mono text-[10.5px] text-ink-3">{times}</span>
              </button>
            )
          })}
        </div>
      )}
      <form className="flex gap-[5px]" onSubmit={submit}>
        <input
          ref={input}
          aria-label="Shift times"
          aria-invalid={!!error}
          aria-describedby={alreadyNa ? 'shift-popover-note shift-popover-na' : 'shift-popover-note'}
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
      {alreadyNa && (
        <p
          id="shift-popover-na"
          className="mt-[7px] border-t border-line pt-[7px] text-[11.5px] leading-[1.45] text-ink-3"
        >
          {alreadyNaNote(person.name, date)}
        </p>
      )}
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
        {!shift && !alreadyNa && (
          <button
            className="btn"
            title={na === 'marked' ? "Take off this week's note" : "Note they can't work this day, this week only"}
            onClick={() => save(() => setMarkedNa({ week, staffId: person.id, date, marked: na !== 'marked' }))}
          >
            {na === 'marked' ? 'Clear N/A' : 'Mark N/A'}
          </button>
        )}
        {shift && (
          // The shift as saved, not whatever is typed in the box
          <button
            className="btn"
            title="Put the same times in other cells"
            onClick={() => {
              if (saving.current) return // it's about to change, or go
              done()
              onCopy(shift)
            }}
          >
            Copy
          </button>
        )}
        <button className="btn" onClick={() => done()}>
          Cancel
        </button>
      </div>
    </Popover>
  )
}
