import { AGAINST_EXPECTED, againstExpected, hoursAgainstShort, hoursFor, weekTotal } from '@/lib/roster/hours'
import type { Shift } from '@/lib/roster/shifts'
import { firstName } from '@/lib/roster/staff'
import { formatHours } from '@/lib/roster/time'
import { Panel } from './Panel'

type Person = { id: number; name: string; expectedHours: number | null }

// The hours that fill a bar. Anyone past them has a full one.
const BAR_FULL = 30 * 60

const barColour = { over: 'bg-crit', under: 'bg-warn' }

/** Each person's hours against what they usually work, in row order, then the week's total. */
export function HoursThisWeek({ staff, shifts }: { staff: Person[]; shifts: Shift[] }) {
  return (
    <Panel title="Hours this week">
      <ul className="py-1 text-[12.5px]">
        {staff.map((person) => {
          const hours = hoursFor(person.id, shifts)
          const mark = againstExpected(hours, person.expectedHours)
          return (
            <li
              key={person.id}
              title={mark ? AGAINST_EXPECTED[mark] : undefined}
              className="flex items-center gap-2 px-3 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate">{firstName(person.name)}</span>
              <span aria-hidden className="h-1.25 w-15.5 flex-none overflow-hidden rounded-full bg-surface-2">
                <span
                  className={`block h-full rounded-full ${mark ? barColour[mark] : 'bg-accent'}`}
                  style={{ width: `${Math.min(100, (hours / BAR_FULL) * 100)}%` }}
                />
              </span>
              <span
                className={`min-w-13 text-right font-mono text-[12px] tabular-nums ${mark ? 'font-semibold text-ink' : 'text-ink-2'}`}
              >
                {hoursAgainstShort(hours, person.expectedHours)}
                {mark && <span className="sr-only">. {AGAINST_EXPECTED[mark]}</span>}
              </span>
            </li>
          )
        })}
        <li className="mt-1 flex items-center gap-2 border-t border-line px-3 pt-2.25 pb-1.5 font-semibold">
          <span className="flex-1">Total</span>
          <span className="font-mono text-[12px] tabular-nums">{formatHours(weekTotal(shifts))}</span>
        </li>
      </ul>
    </Panel>
  )
}
