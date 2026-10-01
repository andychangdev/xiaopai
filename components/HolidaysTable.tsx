'use client'

import { useRef, useState } from 'react'
import { addHoliday, removeHoliday } from '@/app/actions'
import type { HolidayListRow } from '@/lib/db/queries'
import { holidayDate } from '@/lib/roster/cost'
import type { IsoDate } from '@/lib/roster/dates'
import { sectionRefusal, tableScroll, td, th } from './Page'
import { UNREACHABLE } from './ShiftPopover'

const none = <span className="text-ink-3">—</span>

/** Every public holiday, soonest first, with past ones greyed and a row at the foot to add another. */
export function HolidaysTable({ holidays, today }: { holidays: HolidayListRow[]; today: IsoDate }) {
  const [error, setError] = useState<string>()
  const form = 'add-holiday'
  // A second Enter before the first add returns would add it twice
  const adding = useRef(false)

  async function remove(id: number) {
    setError((await removeHoliday(id).catch(() => ({ error: UNREACHABLE }))).error)
  }

  return (
    <>
      <div className={tableScroll}>
        <table className="w-full min-w-120 border-collapse">
          <thead>
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Name</th>
              <th className={th}>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {holidays.length ? (
              holidays.map((h) => {
                const past = h.date < today
                return (
                  <tr key={h.id} className={past ? 'text-ink-3' : ''}>
                    <td className={`${td} font-mono text-[12.5px]`}>
                      {holidayDate(h.date)}
                      {past && <span className="sr-only"> (past)</span>}
                    </td>
                    <td className={td}>{h.name ?? none}</td>
                    <td className={`${td} text-right`}>
                      <button
                        className="text-link text-ink-3 hover:text-crit-deep focus-visible:text-crit-deep"
                        aria-label={`Remove ${h.name ?? 'the public holiday'} on ${holidayDate(h.date)}`}
                        onClick={() => remove(h.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={3} className={`${td} text-ink-3`}>
                  No public holidays yet.
                </td>
              </tr>
            )}
            <tr className="bg-surface-3">
              <td className={td}>
                <form
                  id={form}
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (adding.current) return
                    adding.current = true
                    const el = e.currentTarget
                    const data = new FormData(el)
                    try {
                      const { error } = await addHoliday({
                        date: String(data.get('date')),
                        name: String(data.get('name')),
                      }).catch(() => ({ error: UNREACHABLE }))
                      setError(error)
                      if (!error) el.reset()
                    } finally {
                      adding.current = false
                    }
                  }}
                />
                <input
                  form={form}
                  name="date"
                  type="date"
                  className="field font-mono"
                  aria-label="Date of the public holiday"
                />
              </td>
              <td className={td}>
                <input
                  form={form}
                  name="name"
                  className="field"
                  aria-label="Name of the public holiday"
                  placeholder="Name (optional)"
                />
              </td>
              <td className={`${td} text-right`}>
                <button form={form} type="submit" className="btn">
                  Add
                </button>
              </td>
            </tr>
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
