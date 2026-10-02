'use client'

import Link from 'next/link'
import { fullDate, weekTitle } from '@/lib/roster/dates'
import type { HistoryRow } from '@/lib/roster/history'
import { formatHours } from '@/lib/roster/time'
import { tableScroll, td, th } from './Page'
import { WeekState } from './WeekState'

const none = <span className="text-ink-3">—</span>
const mono = `${td} font-mono text-[12.5px] tabular-nums`

/** Every week worth looking back on, newest first. Any but the open one can be opened. */
export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  return (
    <div className={tableScroll}>
      <table className="w-full min-w-180 border-collapse">
        <thead>
          <tr>
            <th className={th}>Week</th>
            <th className={th}>State</th>
            <th className={th}>Shifts</th>
            <th className={th}>Hours</th>
            <th className={th}>Published</th>
            <th className={th}>
              <span className="sr-only">Open</span>
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
                <WeekState state={row.state} />
              </td>
              <td className={mono}>{row.shifts}</td>
              <td className={mono}>{formatHours(row.minutes)}</td>
              <td className={mono}>{row.state.status === 'published' ? fullDate(row.state.publishedAt) : none}</td>
              <td className={`${td} text-right whitespace-nowrap`}>
                {!row.open && (
                  <Link
                    href={`/roster/${row.weekStart}`}
                    className="text-link"
                    aria-label={`Open ${weekTitle(row.weekStart)}`}
                  >
                    Open
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
