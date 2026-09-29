'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { addShift, clearWeek, moveShift, removeShift, setDayClosed } from '@/app/actions'
import type { Template } from '@/lib/db/queries'
import { closedThisWeek } from '@/lib/roster/closed'
import { dayLabel, dayName, shortDate, weekDates, weekRange, type IsoDate } from '@/lib/roster/dates'
import { AGAINST_EXPECTED, againstExpected, hoursAgainst, hoursFor, weekTotal } from '@/lib/roster/hours'
import { leaveOn, onLeaveNote, type Leave } from '@/lib/roster/leave'
import { naNote, naReason, type NaNote } from '@/lib/roster/notAvailable'
import { cellKey, copyShift, shiftsByCell, shiftsLabel, type NewShift, type Shift } from '@/lib/roster/shifts'
import { firstName } from '@/lib/roster/staff'
import { formatHours, formatRange, type Minutes } from '@/lib/roster/time'
import { buildWarnings, overlappingShifts } from '@/lib/roster/warnings'
import { CopyPreviousWeek } from './CopyPreviousWeek'
import { HoursThisWeek } from './HoursThisWeek'
import { LeavePopover } from './LeavePopover'
import type { PopoverTarget } from './Popover'
import { ShiftPopover, UNREACHABLE, actionError } from './ShiftPopover'
import { UndoButton } from './UndoButton'
import { useAsk } from './useAsk'
import { WarningsPanel } from './WarningsPanel'

type Person = { id: number; name: string }

/** Someone with a row on the grid, the hours they usually work and the weekdays they can. */
type StaffRow = Person & { expectedHours: number | null; available: boolean[] }

/** A shift picked up with Copy, whose it is and the chip it came from, until Esc or Done puts it down. */
type Copying = { shift: Shift; person: Person; chip: HTMLElement }

/** A refused paste: which copy it was part of, and the cell it was for. */
type PasteError = { copying: Copying; cell: string; message: string }

/**
 * What clicking a cell does: open the popover, paste the copied shift, or
 * nothing, as the cell already holds it or the person's on leave.
 */
type CellMode = 'edit' | 'paste' | 'holds' | 'away'

type Props = {
  week: IsoDate
  staff: StaffRow[]
  shifts: Shift[]
  /** Who's marked not available on which day, this week only */
  naNotes: NaNote[]
  /** Leave booked during the week, whoever it's for */
  leave: Leave[]
  templates: Template[]
  /** The week's trading hours in one line, for the footer */
  tradingHours: string
  /** Monday first */
  closedDays: boolean[]
  /** How many shifts the week before has, for Copy previous week */
  previousShifts: number
  /** What Undo would take back, or null when there's nothing to */
  lastAction: string | null
  /** From the clock, so today's column can be marked */
  today: IsoDate
}

const headCell =
  'border-b border-line-strong bg-surface-3 px-2 py-2.25 text-[11px] font-semibold tracking-widest uppercase'

export function RosterGrid({
  week,
  staff,
  shifts,
  naNotes,
  leave,
  templates,
  tradingHours,
  closedDays,
  previousShifts,
  lastAction,
  today,
}: Props) {
  const days = weekDates(week)
  const cells = shiftsByCell(shifts)
  const overlapping = overlappingShifts(shifts)
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
      // Esc in a dialog, like Clear week's, is that dialog's
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

  const [dragging, setDragging] = useState<Shift | null>(null)
  // The cell a drop would land in, so it can show it
  const [over, setOver] = useState<string | null>(null)
  const dragFrame = useRef(0)

  function startDrag(shift: Shift) {
    setOpen(null) // it's about the cell the shift is leaving
    // A frame later, once the browser has its picture of the chip, which would otherwise be the dimmed one
    dragFrame.current = requestAnimationFrame(() => setDragging(shift))
  }

  function endDrag() {
    cancelAnimationFrame(dragFrame.current)
    setDragging(null)
    setOver(null)
  }

  // One action rather than a remove and an add, so Undo takes it back in one go
  async function move(shift: Shift, to: { staffId: number; date: IsoDate }) {
    endDrag()
    const error = await actionError(() => moveShift(shift.id, to))
    if (error) await ask({ title: "Couldn't move the shift", body: error, ok: 'OK', cancel: null })
  }

  async function remove(shift: Shift, button: HTMLElement) {
    // The × goes with the chip, so focus moves to the cell's add button, as after the popover's Remove
    const addButton = button.closest('[data-cell]')?.querySelector<HTMLElement>('[data-add]')
    const error = await actionError(() => removeShift(shift.id))
    if (error) {
      await ask({ title: "Couldn't remove the shift", body: error, ok: 'OK', cancel: null })
      return
    }
    // Unless it's gone somewhere else meanwhile
    const focused = document.activeElement
    if (focused === button || focused === document.body) addButton?.focus()
  }

  async function setClosed(date: IsoDate, closed: boolean) {
    const day = dayName(date)
    const n = closed ? shifts.filter((s) => s.date === date).length : 0
    if (
      n &&
      !(await ask({
        title: `Close ${day}?`,
        body: `${day} has ${shiftsLabel(n)} on it. Closing the day removes ${n === 1 ? 'it' : 'them'}.`,
        ok: 'Close the day',
        danger: true,
      }))
    ) {
      return
    }
    const error = await actionError(() => setDayClosed({ week, date, closed }))
    if (error) {
      await ask({ title: `Couldn't ${closed ? 'close' : 'reopen'} ${day}`, body: error, ok: 'OK', cancel: null })
    }
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
            <div className={`${headCell} border-r border-r-line text-ink-2`}>Staff</div>
            {days.map((date, i) => (
              <DayHeading
                key={date}
                date={date}
                closed={closedDays[i]}
                today={date === today}
                onClick={() => setClosed(date, !closedDays[i])}
              />
            ))}

            {staff.map((person) => (
              <Row key={person.id} person={person} hours={hoursFor(person.id, shifts)}>
                {days.map((date, i) => {
                  if (closedDays[i]) return <ClosedCell key={date} />
                  const key = cellKey(person.id, date)
                  const inCell = cells.get(key) ?? []
                  const away = leaveOn(leave, person.id, date)
                  // Leave takes no shift, so there's nothing to paste into it, and no N/A to show
                  const copy = copying && !away && copyShift(copying.shift, { staffId: person.id, date }, inCell)
                  // A drag lands where a paste would: not on leave, nor where those times already are, its own cell included
                  const canDrop = dragging && !away && copyShift(dragging, { staffId: person.id, date }, inCell)
                  const na = away ? null : naReason(person, date, naNotes)
                  return (
                    <Cell
                      key={date}
                      person={person}
                      date={date}
                      shifts={inCell}
                      overlapping={overlapping}
                      na={na ? naNote(na, person.name, date) : undefined}
                      leave={away && onLeaveNote(person.name, away)}
                      mode={!copying ? 'edit' : copy ? 'paste' : away ? 'away' : 'holds'}
                      copying={copying?.shift}
                      onClick={(e, shift) => {
                        if (copying) {
                          // A double click is one paste, not two
                          if (copy && e.detail < 2) paste(copy, person, copying)
                          return
                        }
                        // Clicking what opened the popover again closes it
                        const anchor = e.currentTarget
                        setOpen((o) => (o?.anchor === anchor ? null : { person, date, shift, na, leave: away, anchor }))
                      }}
                      onRemove={remove}
                      dragged={dragging?.id}
                      drop={canDrop ? (over === key ? 'over' : 'open') : undefined}
                      onDrag={(shift) => (shift ? startDrag(shift) : endDrag())}
                      onDropHover={(on) => setOver((o) => (on ? key : o === key ? null : o))}
                      onDrop={() => dragging && move(dragging, { staffId: person.id, date })}
                    />
                  )
                })}
              </Row>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line bg-surface-3 px-3 py-2.5">
          <UndoButton week={week} last={lastAction} />
          <CopyPreviousWeek week={week} previousShifts={previousShifts} />
          <button className="btn btn-danger" onClick={clear}>
            Clear week
          </button>
          <span className="ml-auto self-center font-mono text-[12.5px] text-ink-2 tabular-nums">
            Total rostered <b className="font-semibold text-ink">{formatHours(weekTotal(shifts))}</b>
          </span>
          <span className="order-last basis-full self-center text-[11.5px] text-ink-3">
            {[tradingHours, closedThisWeek(closedDays)].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
      {/* Below the grid rather than beside it, so the roster keeps the full width */}
      <div className="mt-4 grid items-start gap-4 min-[820px]:grid-cols-[minmax(0,1fr)_330px]">
        <WarningsPanel warnings={buildWarnings({ staff, shifts, naNotes, leave, weekStart: week })} />
        <HoursThisWeek staff={staff} shifts={shifts} />
      </div>
      {open &&
        // A leave day's own popover, unless a shift kept on it was clicked
        (open.leave && !open.shift ? (
          <LeavePopover key={cellKey(open.person.id, open.date)} target={open} leave={open.leave} onClose={close} />
        ) : (
          <ShiftPopover
            key={cellKey(open.person.id, open.date) + (open.shift?.id ?? '+')}
            week={week}
            target={open}
            templates={templates}
            onClose={close}
            onCopy={(shift) => setCopying({ shift, person: open.person, chip: open.anchor })}
          />
        ))}
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

/** Closes the day for this week, or reopens it. Today's is underlined in the accent, closed or not. */
function DayHeading({
  date,
  closed,
  today,
  onClick,
}: {
  date: IsoDate
  closed: boolean
  today: boolean
  onClick: () => void
}) {
  const action = `${closed ? 'Reopen' : 'Close'} ${dayName(date)}`
  const colour = closed ? 'text-ink-3' : today ? 'text-accent-deep' : 'text-ink-2 hover:text-ink'
  return (
    <button
      aria-label={`${dayLabel(date)}${today ? ', today' : ''}${closed ? ', closed' : ''}. ${action}`}
      title={today ? `Today. ${action}` : action}
      className={`${headCell} group relative text-center ${colour} ${today ? 'shadow-[inset_0_-2px_0_var(--color-accent)]' : ''} hover:bg-surface-2`}
      onClick={onClick}
    >
      {dayName(date)}
      <span
        className={`block font-mono text-[11px] font-normal tracking-normal normal-case ${today && !closed ? '' : 'text-ink-3'}`}
      >
        {closed ? 'closed' : shortDate(date)}
      </span>
      <span
        aria-hidden
        className="absolute top-1.5 right-1.25 text-[10px] font-normal tracking-normal normal-case opacity-0 group-hover:opacity-75 group-focus-visible:opacity-75"
      >
        {closed ? '↺' : '✕'}
      </span>
    </button>
  )
}

/** A day closed this week. It takes no shifts, so there's nothing to click. */
function ClosedCell() {
  return (
    <div className="cell-closed grid min-h-14 place-items-center border-r border-b border-line">
      <span className="font-mono text-[10px] tracking-[0.12em] text-ink-3">CLOSED</span>
    </div>
  )
}

const hoursColour = { over: 'font-semibold text-crit', under: 'font-semibold text-warn' }

/** A person's row: their name and hours this week, then a cell for each day. */
function Row({ person, hours, children }: { person: StaffRow; hours: Minutes; children: React.ReactNode }) {
  const mark = againstExpected(hours, person.expectedHours)
  return (
    <>
      <div className="border-r border-b border-line bg-surface-3 px-2.5 py-2.25">
        <div className="text-[13.5px] font-semibold tracking-[-0.005em]">{person.name}</div>
        <div
          title={mark ? AGAINST_EXPECTED[mark] : undefined}
          className={`mt-1 font-mono text-[12px] tabular-nums ${mark ? hoursColour[mark] : 'text-ink-2'}`}
        >
          {hoursAgainst(hours, person.expectedHours)}
          {mark && <span className="sr-only">. {AGAINST_EXPECTED[mark]}</span>}
        </div>
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
 * A chip's ×, there on hover, removes its shift without the popover. Undo
 * takes it back, so it doesn't ask first.
 *
 * A chip drags to another cell to move its shift there, times and all. While
 * one's being dragged, a cell that could take it outlines itself under the
 * pointer; one that couldn't, like a leave day, refuses the drop.
 *
 * While a shift is being copied, a click anywhere in the cell pastes it
 * alongside what's there, unless the cell already holds those times.
 *
 * A chip that overlaps another is outlined, since the Warnings panel can't
 * say which two.
 *
 * A day the person isn't usually available, or is marked not available this
 * week, is tinted, and says N/A until the pointer's over it. It's a note, so
 * the cell works like any other.
 *
 * A day they're on leave says LEAVE instead, and takes nothing new: clicking
 * it shows the booking. Shifts kept on it when the leave was booked still
 * show, and still open.
 */
function Cell({
  person,
  date,
  shifts,
  overlapping,
  na,
  leave,
  mode,
  copying,
  onClick,
  onRemove,
  dragged,
  drop,
  onDrag,
  onDropHover,
  onDrop,
}: {
  person: Person
  date: IsoDate
  shifts: Shift[]
  /** The week's shifts that overlap another */
  overlapping: Set<number>
  /** Why the person isn't expected this day, when they aren't */
  na?: string
  /** Who's away and when, when the person's on leave this day */
  leave?: string
  mode: CellMode
  copying?: Shift
  onClick: (e: React.MouseEvent<HTMLElement>, shift?: Shift) => void
  /** From a chip's ×, the button itself so focus has somewhere to go after */
  onRemove: (shift: Shift, button: HTMLElement) => void
  /** The id of the shift being dragged, wherever it is */
  dragged?: number
  /** Whether the shift being dragged could land here, and if the pointer's here now */
  drop?: 'open' | 'over'
  /** A chip picked up, or null once it's put down, wherever that is */
  onDrag: (shift: Shift | null) => void
  onDropHover: (over: boolean) => void
  onDrop: () => void
}) {
  const filled = shifts.length > 0
  const where = `${person.name} on ${dayLabel(date)}`
  const copyTimes = copying && formatRange(copying.start, copying.end)
  const add = {
    edit: leave ? `${leave}. Show the booking` : `Add ${filled ? 'another' : 'a'} shift for ${where}`,
    paste: `Paste ${copyTimes} for ${where}`,
    holds: `${where} already has ${copyTimes}`,
    away: `${where} is on leave, so nothing pastes here`,
  }[mode]
  const chipAction = {
    edit: 'Change or remove',
    paste: `Paste ${copyTimes} here`,
    holds: `Already has ${copyTimes}`,
    away: 'On leave, so nothing pastes here',
  }[mode]
  const inert = mode === 'holds' || mode === 'away'
  // Hovering an N/A cell keeps it near its tint, as the mockup does; the + is the sign it's live
  const hover = na ? 'hover:bg-surface-2' : 'hover:bg-surface-3'
  const modeStyle = inert ? '[&_button]:cursor-default' : mode === 'paste' ? `cursor-copy ${hover} [&_button]:cursor-copy` : ''

  return (
    <div
      data-cell
      title={leave ?? na}
      className={`flex min-h-14 flex-col border-r border-b border-line ${filled ? 'gap-1 p-1.25' : ''} ${na ? 'bg-unavail' : ''} ${modeStyle} ${drop === 'over' ? 'outline-2 -outline-offset-2 outline-accent outline-dashed' : ''}`}
      // The padding and the gaps between chips paste too
      onClick={mode === 'paste' ? (e) => e.target === e.currentTarget && onClick(e) : undefined}
      // Only a cell that could take the shift accepts it; anywhere else the drop is refused
      onDragOver={
        drop &&
        ((e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          onDropHover(true)
        })
      }
      onDragLeave={
        // Into one of its own chips is still over the cell
        drop && ((e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && onDropHover(false))
      }
      onDrop={
        drop &&
        ((e) => {
          e.preventDefault()
          onDrop()
        })
      }
    >
      {shifts.map((s) => {
        const times = formatRange(s.start, s.end)
        const picked = s.id === copying?.id
        const overlaps = overlapping.has(s.id)
        const action = picked ? 'Being copied' : chipAction
        // Dragging is for the pointer, so only the tooltip mentions it
        const tip = mode === 'edit' ? `${action}, or drag it to another cell` : action
        return (
          // The × sits over the chip rather than in it, as a button can't hold another
          <div key={s.id} className={`group/chip relative ${s.id === dragged ? 'opacity-40' : ''}`}>
            <button
              aria-label={`${person.name}, ${dayLabel(date)}, ${times}${overlaps ? ', overlaps another shift' : ''}. ${action}`}
              title={overlaps ? `Overlaps another shift. ${tip}` : tip}
              className={`flex w-full items-center rounded-chip border border-l-[3px] py-1 pl-1.5 text-left ${mode === 'edit' ? 'pr-5' : 'pr-1.5'} ${chipColours[overlaps ? 'overlaps' : 'usual']} ${picked ? 'outline-2 outline-offset-1 outline-accent outline-dashed focus-visible:outline-offset-2 focus-visible:outline-solid' : ''}`}
              onClick={(e) => onClick(e, s)}
              // Not while copying, when a press on the chip is a paste
              draggable={mode === 'edit'}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', `${person.name}, ${dayLabel(date)}, ${times}`)
                onDrag(s)
              }}
              onDragEnd={() => onDrag(null)}
            >
              <span className="font-mono text-[11.5px] font-medium tracking-[-0.02em] whitespace-nowrap tabular-nums">
                {times}
              </span>
            </button>
            {/* While copying, a click on the chip pastes, so there's nothing to remove */}
            {mode === 'edit' && (
              <button
                aria-label={`Remove ${person.name}'s ${times} on ${dayLabel(date)}`}
                title="Remove"
                className="absolute inset-y-0 right-0 grid w-5 place-items-center rounded-chip text-[13px] leading-none text-ink-3 opacity-0 group-hover/chip:opacity-100 hover:text-crit focus-visible:opacity-100"
                onClick={(e) => onRemove(s, e.currentTarget)}
              >
                ×
              </button>
            )}
          </div>
        )
      })}
      <button
        data-add
        aria-label={na ? `${add}. ${na}` : add}
        // While copying, what a click would paste matters more than why the day is N/A
        title={mode !== 'edit' ? add : (leave ?? (filled ? 'Add another shift' : (na ?? add)))}
        className={`group grid flex-1 place-items-center ${inert ? '' : hover} ${filled ? 'min-h-4.5 rounded-chip' : ''}`}
        onClick={(e) => onClick(e)}
      >
        {/* A chip leaves no room for it, so a filled cell keeps just the tint */}
        {na && !filled && (
          <span
            aria-hidden
            className="col-start-1 row-start-1 font-mono text-[10.5px] font-medium tracking-[0.12em] text-ink-3 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"
          >
            N/A
          </span>
        )}
        {leave ? (
          <span
            aria-hidden
            className="col-start-1 row-start-1 font-mono text-[11px] font-medium tracking-[0.14em] text-off"
          >
            LEAVE
          </span>
        ) : (
          !inert && <Plus small={filled} times={mode === 'paste' ? copyTimes : undefined} />
        )}
      </button>
    </div>
  )
}

// On the wrapper's hover, so the chip stays lit with the pointer on its ×
const chipColours = {
  usual:
    'border-line border-l-accent bg-surface-3 group-hover/chip:border-line-strong group-hover/chip:border-l-accent group-hover/chip:bg-surface-2',
  overlaps: 'border-crit-line bg-crit-bg group-hover/chip:border-crit',
}

/** The + on hover, and while pasting the times that would go in. */
function Plus({ small = false, times }: { small?: boolean; times?: string }) {
  return (
    <span
      aria-hidden
      className={`col-start-1 row-start-1 leading-none text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${small ? 'text-[14px]' : 'text-[17px]'}`}
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
