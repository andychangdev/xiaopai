'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fullDate, weekTitle } from '@/lib/roster/dates'
import { historyBadge, type HistoryRow } from '@/lib/roster/history'
import { needsPublishing } from '@/lib/roster/publish'
import { formatHours } from '@/lib/roster/time'
import { td, th } from './Page'
import { useCopyWeek } from './useCopyWeek'

const none = <span className="text-ink-3">—</span>
const mono = `${td} font-mono text-[12.5px] tabular-nums`

/**
 * Every week worth looking back on, newest first. Any but the open one can be
 * opened, or copied into the open week exactly as Copy previous week would,
 * after which you're back on its grid.
 */
export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  const [dialog, copy] = useCopyWeek()
  const router = useRouter()
  const open = rows.find((r) => r.open)!.weekStart

  async function copyIntoOpen(row: HistoryRow) {
    if (await copy({ from: row.weekStart, to: open, fromShifts: row.shifts })) router.push(`/roster/${open}`)
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              <th className={th}>Week</th>
              <th className={th}>State</th>
              <th className={th}>Shifts</th>
              <th className={th}>Hours</th>
              <th className={th}>Published</th>
              <th className={th}>
                <span className="sr-only">Open or copy</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.weekStart} className={row.open ? 'bg-surface-3' : ''}>
                <td className={td}>
                  <span className="font-semibold">{weekTitle(row.weekStart)}</span>
                  {row.open && <span className="text-ink-3"> · open</span>}
                </td>
                <td className={td}>
                  <State row={row} />
                </td>
                <td className={mono}>{row.shifts}</td>
                <td className={mono}>{formatHours(row.minutes)}</td>
                <td className={mono}>{row.state.status === 'published' ? fullDate(row.state.publishedAt) : none}</td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  {!row.open && (
                    <span className="inline-flex gap-3">
                      <Link
                        href={`/roster/${row.weekStart}`}
                        className="text-link"
                        aria-label={`Open ${weekTitle(row.weekStart)}`}
                      >
                        Open
                      </Link>
                      <button
                        className="text-link"
                        aria-label={`Copy into open week from ${weekTitle(row.weekStart)}`}
                        onClick={() => copyIntoOpen(row)}
                      >
                        Copy into open week
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dialog}
    </>
  )
}

/** Like the grid's badge: the accent once it's out as it stands, amber while it still needs publishing. */
function State({ row: { state } }: { row: HistoryRow }) {
  const live = !needsPublishing(state)
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <span
        className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.07em] whitespace-nowrap uppercase ${live ? 'border-accent text-accent' : 'border-warn-line bg-warn-bg text-warn'}`}
      >
        {historyBadge(state)}
      </span>
      {state.status === 'published' && state.changed && (
        <span className="text-[12px] whitespace-nowrap text-warn">edited since</span>
      )}
    </span>
  )
}
