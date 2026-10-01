'use client'

import { useState } from 'react'
import { setTradingHours } from '@/app/actions'
import { DAY_NAMES } from '@/lib/roster/dates'
import { openMinutes, unusualDays, type TradingDay } from '@/lib/roster/settings'
import { formatHours } from '@/lib/roster/time'
import { sectionRefusal } from './Page'
import { UNREACHABLE } from './ShiftPopover'
import { TimeSelect } from './TimeSelect'

/**
 * Opening and closing for each weekday, as a strip of day cards like the
 * roster's columns, Monday first. A day whose hours aren't the usual ones has
 * the highlight, so a late night stands out. On a narrow screen the cards
 * wrap onto more rows.
 */
export function TradingHours({ week }: { week: TradingDay[] }) {
  const [error, setError] = useState<string>()
  const unusual = unusualDays(week)

  // Only what changed goes up, so two quick picks can't undo each other
  async function save(weekday: number, patch: Partial<TradingDay>) {
    const result = await setTradingHours(weekday, patch).catch(() => ({ error: UNREACHABLE }))
    setError(result.error)
  }

  return (
    <>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-1.5">
        {week.map(({ open, close }, weekday) => {
          const day = DAY_NAMES[weekday]
          return (
            <li
              key={day}
              className={`grid gap-1.5 rounded-control border p-1.5 ${unusual[weekday] ? 'highlight' : 'border-line bg-surface-3'}`}
            >
              <div className="flex items-baseline justify-between px-0.5 pt-0.5">
                <span className="text-[10.5px] font-semibold tracking-[0.09em] uppercase">{day}</span>
                <span className={`font-mono text-[11px] tabular-nums ${unusual[weekday] ? '' : 'text-ink-3'}`}>
                  {formatHours(close - open)}
                </span>
              </div>
              <TimeSelect fill label={`${day} opens`} value={open} onSave={(t) => save(weekday, { open: t })} />
              <TimeSelect fill label={`${day} closes`} value={close} onSave={(t) => save(weekday, { close: t })} />
            </li>
          )
        })}
      </ul>
      <p className="mt-2.5 text-[12px] text-ink-2">
        <b className="font-mono font-medium text-ink tabular-nums">{formatHours(openMinutes(week))}</b> open a week.
        {unusual.some(Boolean) && ' Days with other hours than the rest are highlighted.'}
      </p>
      {error && (
        <p role="alert" className={sectionRefusal}>
          {error}
        </p>
      )}
    </>
  )
}
