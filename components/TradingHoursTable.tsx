'use client'

import { useState } from 'react'
import { setTradingHours } from '@/app/actions'
import { DAY_NAMES } from '@/lib/roster/dates'
import type { TradingDay } from '@/lib/roster/settings'
import { formatHours } from '@/lib/roster/time'
import { sectionRefusal, tableScroll, td, th } from './Page'
import { UNREACHABLE } from './ShiftPopover'
import { TimeSelect } from './TimeSelect'

/** Opening and closing for each weekday, Monday first, with the day's hours. */
export function TradingHoursTable({ week }: { week: TradingDay[] }) {
  const [error, setError] = useState<string>()

  // Only what changed goes up, so two quick picks can't undo each other
  async function save(weekday: number, patch: Partial<TradingDay>) {
    const result = await setTradingHours(weekday, patch).catch(() => ({ error: UNREACHABLE }))
    setError(result.error)
  }

  return (
    <>
      <div className={tableScroll}>
        <table className="w-full min-w-110 border-collapse">
          <thead>
            <tr>
              <th className={th}>Day</th>
              <th className={th}>Opens</th>
              <th className={th}>Closes</th>
              <th className={th}>Hours</th>
            </tr>
          </thead>
          <tbody>
            {week.map(({ open, close }, weekday) => {
              const day = DAY_NAMES[weekday]
              return (
                <tr key={day}>
                  <td className={`${td} font-semibold`}>{day}</td>
                  <td className={td}>
                    <TimeSelect label={`${day} opens`} value={open} onSave={(t) => save(weekday, { open: t })} />
                  </td>
                  <td className={td}>
                    <TimeSelect label={`${day} closes`} value={close} onSave={(t) => save(weekday, { close: t })} />
                  </td>
                  <td className={`${td} font-mono tabular-nums`}>{formatHours(close - open)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {error && (
        <p role="alert" className={sectionRefusal}>
          {error}
        </p>
      )}
    </>
  )
}
