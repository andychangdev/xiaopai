'use client'

import { useRef } from 'react'
import { copyWeek } from '@/app/actions'
import { nothingToCopy } from '@/lib/roster/copy'
import { addDays, weekRange, type IsoDate } from '@/lib/roster/dates'
import { shiftsLabel } from '@/lib/roster/shifts'
import { UNREACHABLE } from './ShiftPopover'
import { useAsk } from './useAsk'

/**
 * Fills the week from the one before. Says so when there's nothing to copy,
 * asks before replacing shifts already there, then reports what came across
 * and what was skipped, so nothing disappears silently.
 */
export function CopyPreviousWeek({
  week,
  shifts,
  previousShifts,
}: {
  week: IsoDate
  /** How many shifts this week has, and the week before */
  shifts: number
  previousShifts: number
}) {
  const [dialog, ask] = useAsk()
  // With nothing to confirm, a second click before the first copy lands would copy twice
  const copying = useRef(false)
  const from = addDays(week, -7)
  const notify = (title: string, body: string) => ask({ title, body, ok: 'OK', cancel: null })

  async function copy() {
    if (copying.current) return
    if (!previousShifts) {
      await notify('Nothing to copy', nothingToCopy(from))
      return
    }
    if (
      shifts &&
      !(await ask({
        title: 'Replace this week?',
        body: `${weekRange(week)} already has ${shiftsLabel(shifts)} on it. Copying ${weekRange(from)} over the top replaces ${shifts === 1 ? 'it' : 'them'}.`,
        ok: 'Replace',
        danger: true,
      }))
    ) {
      return
    }

    copying.current = true
    const result = await copyWeek({ from, to: week }).catch(() => ({ error: UNREACHABLE, report: undefined }))
    copying.current = false
    if (result.error) await notify("Couldn't copy the week", result.error)
    else if (result.report) await notify('Copied', result.report)
  }

  return (
    <>
      <button className="btn" onClick={copy}>
        Copy previous week
      </button>
      {dialog}
    </>
  )
}
