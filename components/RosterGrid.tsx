'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { clearWeek } from '@/app/actions'
import { dayLabel, dayName, shortDate, weekDates, weekRange, type IsoDate } from '@/lib/roster/dates'
import { cellKey, shiftsByCell, type Shift } from '@/lib/roster/shifts'
import { formatRange } from '@/lib/roster/time'
import { ShiftPopover, UNREACHABLE, type PopoverTarget } from './ShiftPopover'
import { useAsk } from './useAsk'

type Person = { id: number; name: string }

type Props = {
  week: IsoDate
  staff: Person[]
  shifts: Shift[]
}

const headCell =
  'border-b border-line-strong bg-surface-3 px-2 py-[9px] text-[11px] font-semibold tracking-[0.1em] text-ink-2 uppercase'

export function RosterGrid({ week, staff, shifts }: Props) {
  const days = weekDates(week)
  const cells = shiftsByCell(shifts)
  const [dialog, ask] = useAsk()
  const [open, setOpen] = useState<PopoverTarget | null>(null)

  // Only closes the popover it's asked about, so a save that finishes after
  // you've moved on to another cell leaves that one open
  const close = useCallback((which: PopoverTarget) => setOpen((o) => (o === which ? null : o)), [])

  async function clear() {
    const n = shifts.length
    if (!n) {
      await ask({ title: 'Nothing to clear', body: 'This week has no shifts on it yet.', ok: 'OK', cancel: null })
      return
    }
    const yes = await ask({
      title: 'Clear this week?',
      body: `Removes every shift from ${weekRange(week)}. Booked leave, N/A notes and closed days stay as they are.`,
      ok: `Clear ${n} shift${n === 1 ? '' : 's'}`,
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
                {days.map((date) => (
                  <Cell
                    key={date}
                    person={person}
                    date={date}
                    shifts={cells.get(cellKey(person.id, date)) ?? []}
                    onOpen={(anchor, shift) => setOpen({ person, date, shift, anchor })}
                  />
                ))}
              </Row>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line bg-surface-3 px-3 py-2.5">
          <Link href="/staff" className="btn">
            Manage staff
          </Link>
          <button className="btn btn-danger" onClick={clear}>
            Clear week
          </button>
        </div>
      </div>
      {open && <ShiftPopover key={cellKey(open.person.id, open.date) + (open.shift?.id ?? '+')} week={week} target={open} onClose={close} />}
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
 */
function Cell({
  person,
  date,
  shifts,
  onOpen,
}: {
  person: Person
  date: IsoDate
  shifts: Shift[]
  onOpen: (anchor: HTMLElement, shift?: Shift) => void
}) {
  const filled = shifts.length > 0
  const add = `Add ${filled ? 'another' : 'a'} shift for ${person.name} on ${dayLabel(date)}`

  return (
    <div data-cell className={`flex min-h-14 flex-col border-r border-b border-line ${filled ? 'gap-1 p-[5px]' : ''}`}>
      {shifts.map((s) => {
        const times = formatRange(s.start, s.end)
        return (
          <button
            key={s.id}
            aria-label={`${person.name}, ${dayLabel(date)}, ${times}. Change or remove`}
            title="Change or remove"
            className="flex w-full items-center rounded-chip border border-l-[3px] border-line border-l-accent bg-surface-3 px-1.5 py-1 text-left hover:border-line-strong hover:border-l-accent hover:bg-surface-2"
            onClick={(e) => onOpen(e.currentTarget, s)}
          >
            <span className="font-mono text-[11.5px] font-medium tracking-[-0.02em] tabular-nums">{times}</span>
          </button>
        )
      })}
      <button
        data-add
        aria-label={add}
        title={filled ? 'Add another shift' : add}
        className={`group grid flex-1 place-items-center hover:bg-surface-3 ${filled ? 'min-h-[18px] rounded-chip' : ''}`}
        onClick={(e) => onOpen(e.currentTarget)}
      >
        <Plus small={filled} />
      </button>
    </div>
  )
}

function Plus({ small = false }: { small?: boolean }) {
  return (
    <span
      aria-hidden
      className={`leading-none text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${small ? 'text-[14px]' : 'text-[17px]'}`}
    >
      +
    </span>
  )
}
