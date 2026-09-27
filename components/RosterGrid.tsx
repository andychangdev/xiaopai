'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { addShift, clearWeek } from '@/app/actions'
import type { Template } from '@/lib/db/queries'
import { dayLabel, dayName, shortDate, weekDates, weekRange, type IsoDate } from '@/lib/roster/dates'
import { cellKey, copyShift, shiftsByCell, shiftsLabel, type NewShift, type Shift } from '@/lib/roster/shifts'
import { firstName } from '@/lib/roster/staff'
import { formatRange } from '@/lib/roster/time'
import { ShiftPopover, UNREACHABLE, actionError, type PopoverTarget } from './ShiftPopover'
import { useAsk } from './useAsk'

type Person = { id: number; name: string }

/** A shift picked up with Copy, whose it is and the chip it came from, until Esc or Done puts it down. */
type Copying = { shift: Shift; person: Person; chip: HTMLElement }

/** A refused paste: which copy it was part of, and the cell it was for. */
type PasteError = { copying: Copying; cell: string; message: string }

/** What clicking a cell does: open the popover, paste the copied shift, or nothing, as the cell already holds it. */
type CellMode = 'edit' | 'paste' | 'holds'

type Props = {
  week: IsoDate
  staff: Person[]
  shifts: Shift[]
  templates: Template[]
  /** The week's trading hours in one line, for the footer */
  tradingHours: string
}

const headCell =
  'border-b border-line-strong bg-surface-3 px-2 py-[9px] text-[11px] font-semibold tracking-[0.1em] text-ink-2 uppercase'

export function RosterGrid({ week, staff, shifts, templates, tradingHours }: Props) {
  const days = weekDates(week)
  const cells = shiftsByCell(shifts)
  const [dialog, ask] = useAsk()
  const [open, setOpen] = useState<PopoverTarget | null>(null)

  // Only closes the popover it's asked about, so a save that finishes after
  // you've moved on to another cell leaves that one open
  const close = useCallback((which: PopoverTarget) => setOpen((o) => (o === which ? null : o)), [])

  const [copying, setCopying] = useState<Copying | null>(null)
  const [pasteError, setPasteError] = useState<PasteError>()
  // Cells with a paste on its way. Once it lands the cell holds the times and
  // takes no more, but until then a second click would paste again.
  const pasting = useRef(new Set<string>())

  const isCopying = copying !== null
  useEffect(() => {
    if (!isCopying) return
    const esc = (e: KeyboardEvent) => {
      // Esc in the Clear week dialog is that dialog's
      if (e.key === 'Escape' && !(e.target as Element).closest('dialog')) setCopying(null)
    }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [isCopying])

  // Back to the chip it started from, rather than losing focus with the bar
  function doneCopying() {
    const chip = copying?.chip
    setCopying(null)
    if (chip?.isConnected) chip.focus()
  }

  // Through addShift, like a typed shift, so whatever refuses one refuses the other
  async function paste(copy: NewShift, person: Person, from: Copying) {
    const cell = cellKey(copy.staffId, copy.date)
    if (pasting.current.has(cell)) return
    pasting.current.add(cell)
    const error = await actionError(() => addShift({ week, ...copy }))
    pasting.current.delete(cell)
    // A refusal stays up until that cell takes a paste, however many others land meanwhile
    setPasteError((shown) =>
      error
        ? { copying: from, cell, message: `${firstName(person.name)} · ${dayLabel(copy.date)}: ${error}` }
        : shown?.cell === cell
          ? undefined
          : shown,
    )
  }

  async function clear() {
    const n = shifts.length
    if (!n) {
      await ask({ title: 'Nothing to clear', body: 'This week has no shifts on it yet.', ok: 'OK', cancel: null })
      return
    }
    const yes = await ask({
      title: 'Clear this week?',
      body: `Removes every shift from ${weekRange(week)}. Booked leave, N/A notes and closed days stay as they are.`,
      ok: `Clear ${shiftsLabel(n)}`,
      danger: true,
    })
    if (!yes) return
    try {
      await clearWeek(week)
    } catch {
      await ask({ title: "Couldn't clear the week", body: UNREACHABLE, ok: 'OK', cancel: null })
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="overflow-x-auto">
          <div className="roster-grid">
            <div className={`${headCell} border-r border-r-line`}>Staff</div>
            {days.map((date) => (
              <div key={date} className={`${headCell} text-center`}>
                {dayName(date)}
                <span className="block font-mono text-[11px] font-normal tracking-normal text-ink-3 normal-case">
                  {shortDate(date)}
                </span>
              </div>
            ))}

            {staff.map((person) => (
              <Row key={person.id} person={person}>
                {days.map((date) => {
                  const inCell = cells.get(cellKey(person.id, date)) ?? []
                  const copy = copying && copyShift(copying.shift, { staffId: person.id, date }, inCell)
                  return (
                    <Cell
                      key={date}
                      person={person}
                      date={date}
                      shifts={inCell}
                      mode={!copying ? 'edit' : copy ? 'paste' : 'holds'}
                      copying={copying?.shift}
                      onClick={(e, shift) => {
                        if (!copying) setOpen({ person, date, shift, anchor: e.currentTarget })
                        // A double click is one paste, not two
                        else if (copy && e.detail < 2) paste(copy, person, copying)
                      }}
                    />
                  )
                })}
              </Row>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line bg-surface-3 px-3 py-2.5">
          <Link href="/staff" className="btn">
            Manage staff
          </Link>
          <Link href="/settings" className="btn">
            Trading hours
          </Link>
          <button className="btn btn-danger" onClick={clear}>
            Clear week
          </button>
          <span className="order-last basis-full self-center text-[11.5px] text-ink-3">{tradingHours}</span>
        </div>
      </div>
      {open && (
        <ShiftPopover
          key={cellKey(open.person.id, open.date) + (open.shift?.id ?? '+')}
          week={week}
          target={open}
          templates={templates}
          onClose={close}
          onCopy={(shift) => setCopying({ shift, person: open.person, chip: open.anchor })}
        />
      )}
      {copying && (
        <>
          {/* Room to scroll the footer out from under the bar */}
          <div aria-hidden className="h-20" />
          <CopyBar
            copying={copying}
            error={pasteError?.copying === copying ? pasteError.message : undefined}
            onDone={doneCopying}
          />
        </>
      )}
      {dialog}
    </>
  )
}

function Row({ person, children }: { person: Person; children: React.ReactNode }) {
  return (
    <>
      <div className="border-r border-b border-line bg-surface-3 px-2.5 py-[9px]">
        <div className="text-[13.5px] font-semibold tracking-[-0.005em]">{person.name}</div>
      </div>
      {children}
    </>
  )
}

/**
 * One person on one day. Each chip edits its own shift, and the add button
 * fills the rest: the whole cell when it's empty, the space beneath the chips
 * when it isn't. It stays the same element either way, so focus is still on it
 * after a save.
 *
 * While a shift is being copied, a click anywhere in the cell pastes it
 * alongside what's there, unless the cell already holds those times.
 */
function Cell({
  person,
  date,
  shifts,
  mode,
  copying,
  onClick,
}: {
  person: Person
  date: IsoDate
  shifts: Shift[]
  mode: CellMode
  copying?: Shift
  onClick: (e: React.MouseEvent<HTMLElement>, shift?: Shift) => void
}) {
  const filled = shifts.length > 0
  const where = `${person.name} on ${dayLabel(date)}`
  const copyTimes = copying && formatRange(copying.start, copying.end)
  const add = {
    edit: `Add ${filled ? 'another' : 'a'} shift for ${where}`,
    paste: `Paste ${copyTimes} for ${where}`,
    holds: `${where} already has ${copyTimes}`,
  }[mode]
  const chipAction = { edit: 'Change or remove', paste: `Paste ${copyTimes} here`, holds: `Already has ${copyTimes}` }[
    mode
  ]
  const modeStyle = {
    edit: '',
    paste: 'cursor-copy hover:bg-surface-3 [&_button]:cursor-copy',
    holds: '[&_button]:cursor-default',
  }[mode]

  return (
    <div
      data-cell
      className={`flex min-h-14 flex-col border-r border-b border-line ${filled ? 'gap-1 p-[5px]' : ''} ${modeStyle}`}
      // The padding and the gaps between chips paste too
      onClick={mode === 'paste' ? (e) => e.target === e.currentTarget && onClick(e) : undefined}
    >
      {shifts.map((s) => {
        const times = formatRange(s.start, s.end)
        const picked = s.id === copying?.id
        const action = picked ? 'Being copied' : chipAction
        return (
          <button
            key={s.id}
            aria-label={`${person.name}, ${dayLabel(date)}, ${times}. ${action}`}
            title={action}
            className={`flex w-full items-center rounded-chip border border-l-[3px] border-line border-l-accent bg-surface-3 px-1.5 py-1 text-left hover:border-line-strong hover:border-l-accent hover:bg-surface-2 ${picked ? 'outline-2 outline-offset-1 outline-accent outline-dashed focus-visible:outline-offset-2 focus-visible:outline-solid' : ''}`}
            onClick={(e) => onClick(e, s)}
          >
            <span className="font-mono text-[11.5px] font-medium tracking-[-0.02em] tabular-nums">{times}</span>
          </button>
        )
      })}
      <button
        data-add
        aria-label={add}
        title={mode === 'edit' && filled ? 'Add another shift' : add}
        className={`group grid flex-1 place-items-center ${mode === 'holds' ? '' : 'hover:bg-surface-3'} ${filled ? 'min-h-[18px] rounded-chip' : ''}`}
        onClick={(e) => onClick(e)}
      >
        {mode !== 'holds' && <Plus small={filled} times={mode === 'paste' ? copyTimes : undefined} />}
      </button>
    </div>
  )
}

/** The + on hover, and while pasting the times that would go in. */
function Plus({ small = false, times }: { small?: boolean; times?: string }) {
  return (
    <span
      aria-hidden
      className={`leading-none text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${small ? 'text-[14px]' : 'text-[17px]'}`}
    >
      +{times && <span className="ml-1 font-mono text-[11px] tracking-[-0.02em] tabular-nums">{times}</span>}
    </span>
  )
}

/** Stays in view at the foot of the window while copying, so the grid doesn't shift under the pointer. */
function CopyBar({ copying, error, onDone }: { copying: Copying; error?: string; onDone: () => void }) {
  const { shift, person } = copying
  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-40 flex w-max max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-3.5 rounded-card border border-line-strong bg-surface px-3.5 py-2.5 shadow-popover"
    >
      <div className="min-w-0">
        <div className="text-[13px] font-semibold">
          Copying {firstName(person.name)}&apos;s {dayName(shift.date)}{' '}
          <span className="font-mono font-medium tracking-[-0.02em]">{formatRange(shift.start, shift.end)}</span>
        </div>
        <div className={`mt-0.5 max-w-[52ch] text-[11.5px] leading-snug ${error ? 'text-crit' : 'text-ink-3'}`}>
          {error ?? "Click cells to paste it in. Esc when you're done."}
        </div>
      </div>
      <button className="btn shrink-0" onClick={onDone}>
        Done
      </button>
    </div>
  )
}
