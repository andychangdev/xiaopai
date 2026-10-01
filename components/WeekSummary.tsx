import Link from 'next/link'
import {
  NO_RATE,
  costFor,
  formatDollars,
  noRateNote,
  rosteredWithoutRate,
  weekCost,
  type Cents,
  type PayRates,
} from '@/lib/roster/cost'
import type { IsoDate } from '@/lib/roster/dates'
import { AGAINST_EXPECTED, againstExpected, hoursFor, weekTotal } from '@/lib/roster/hours'
import type { Shift } from '@/lib/roster/shifts'
import type { PublishState } from '@/lib/roster/publish'
import { firstName } from '@/lib/roster/staff'
import { formatHours } from '@/lib/roster/time'
import { InfoIcon } from './Icons'
import { Panel } from './Panel'
import { PublishButton } from './PublishButton'

type Person = { id: number; name: string; expectedHours: number | null; hourlyRate: Cents | null }

// The hours that fill a bar. Anyone past them has a full one.
const BAR_FULL = 30 * 60

const barColour = { over: 'bg-crit', under: 'bg-warn' }

const head = 'py-2 text-[10.5px] font-semibold tracking-[0.09em] whitespace-nowrap text-ink-3 uppercase'
const figure = 'font-mono text-[12px] whitespace-nowrap tabular-nums'
// The cost column is ruled off from the hours, top to bottom
const costCell = 'border-l border-line pr-3 pl-3 text-right'

/**
 * A table of each person's hours against what they usually work, in row
 * order, and the week's total. Anyone with no hours this week is dimmed. Once
 * anyone on the week has an hourly rate, an estimated cost column joins it,
 * totalled like the hours, with a note under the table naming anyone it
 * leaves out for having no rate. Share roster and Publish sit at its foot,
 * to send the week out once the hours and cost look right.
 */
export function WeekSummary({
  week,
  staff,
  shifts,
  rates,
  publish,
  warnings,
}: {
  week: IsoDate
  staff: Person[]
  shifts: Shift[]
  rates: PayRates
  publish: PublishState
  /** How many warnings are outstanding, for the publish dialog */
  warnings: number
}) {
  // Before anyone has a rate, a column of dashes would only be noise
  const priced = staff.some((p) => p.hourlyRate !== null)
  const note = priced ? noRateNote(rosteredWithoutRate(staff, shifts)) : null
  return (
    <Panel title="Week summary">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-line">
            <th className={`${head} pl-3 text-left`}>Staff</th>
            <th className={`${head} pr-3 pl-2 text-right`}>Hours</th>
            {priced && <th className={`${head} ${costCell}`}>Est. cost</th>}
          </tr>
        </thead>
        <tbody>
          {staff.map((person, i) => {
            const hours = hoursFor(person.id, shifts)
            const mark = againstExpected(hours, person.expectedHours)
            const cost = costFor(person.id, shifts, person.hourlyRate, rates)
            const off = hours === 0
            // A little more room above the first row and below the last, so they don't crowd the rules
            const pad = `${i === 0 ? 'pt-2.5' : 'pt-1.25'} ${i === staff.length - 1 ? 'pb-2.5' : 'pb-1.25'}`
            return (
              <tr key={person.id} title={mark ? AGAINST_EXPECTED[mark] : undefined} className={off ? 'text-ink-3' : ''}>
                <td className={`${pad} w-full max-w-0 truncate pl-3`}>{firstName(person.name)}</td>
                <td className={`${pad} pr-3 pl-2`}>
                  <span className="flex items-center justify-end gap-2.5">
                    <span aria-hidden className="h-1.25 w-12 flex-none overflow-hidden rounded-full bg-surface-2">
                      <span
                        className={`block h-full rounded-full ${mark ? barColour[mark] : 'bg-accent'}`}
                        style={{ width: `${Math.min(100, (hours / BAR_FULL) * 100)}%` }}
                      />
                    </span>
                    <span
                      className={`${figure} min-w-12 text-right ${mark ? 'font-semibold text-ink' : off ? '' : 'text-ink-2'}`}
                    >
                      {formatHours(hours)}
                      {person.expectedHours !== null && (
                        <span className="font-normal text-ink-3">/{person.expectedHours}</span>
                      )}
                      {mark && <span className="sr-only">. {AGAINST_EXPECTED[mark]}</span>}
                    </span>
                  </span>
                </td>
                {priced && (
                  <td className={`${pad} ${costCell} ${figure} ${off ? '' : 'text-ink-2'}`}>
                    {cost === null ? (
                      <span title={NO_RATE} className="text-ink-3">
                        <span aria-hidden>—</span>
                        <span className="sr-only">{NO_RATE}</span>
                      </span>
                    ) : (
                      formatDollars(cost)
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-line font-semibold">
            <td className="py-2 pl-3">Total</td>
            <td className={`py-2 pr-3 pl-2 text-right ${figure}`}>{formatHours(weekTotal(shifts))}</td>
            {priced && (
              <td className={`py-2 ${costCell} ${figure}`}>{formatDollars(weekCost(staff, shifts, rates))}</td>
            )}
          </tr>
        </tfoot>
      </table>
      {note && (
        <p className="flex gap-2 border-t border-line px-3 py-2.5 text-[11.5px] leading-snug text-ink-3">
          <span className="mt-px flex-none">
            <InfoIcon />
          </span>
          {note}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 border-t border-line bg-surface-3 px-3 py-2.5">
        <Link href={`/share/${week}`} className="btn text-center">
          Share roster
        </Link>
        <PublishButton
          week={week}
          state={publish}
          shifts={shifts.length}
          minutes={weekTotal(shifts)}
          warnings={warnings}
        />
      </div>
    </Panel>
  )
}
