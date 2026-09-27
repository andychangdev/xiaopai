'use client'

import { useRef } from 'react'
import { copyWeek } from '@/app/actions'
import { nothingToCopy } from '@/lib/roster/copy'
import { weekRange, type IsoDate } from '@/lib/roster/dates'
import { shiftsLabel } from '@/lib/roster/shifts'
import { UNREACHABLE } from './ShiftPopover'
import { useAsk } from './useAsk'

/**
 * Copies one week over another, for Copy previous week and History's Copy
 * into open week alike. Says so when there's nothing to copy, asks before
 * replacing shifts already there, then reports what came across and what was
 * skipped, so nothing disappears silently. Render `dialog` anywhere; `copy`
 * resolves true once the week has been copied and the report read.
 *
 *   const [dialog, copy] = useCopyWeek()
 *   copy({ from, to, fromShifts: 12 })
 */
export function useCopyWeek() {
  const [dialog, ask] = useAsk()
  // A second click before the first copy lands would copy twice
  const copying = useRef(false)
  const notify = (title: string, body: string) => ask({ title, body, ok: 'OK', cancel: null })

  async function copy({
    from,
    to,
    fromShifts,
  }: {
    from: IsoDate
    to: IsoDate
    /** How many shifts the week copied from has */
    fromShifts: number
  }): Promise<boolean> {
    if (copying.current) return false
    if (!fromShifts) {
      await notify('Nothing to copy', nothingToCopy(from))
      return false
    }

    copying.current = true
    try {
      const send = (replace?: boolean) =>
        copyWeek({ from, to, replace }).catch(() => ({ error: UNREACHABLE, report: undefined, replacing: undefined }))
      // The server says whether there's anything to replace, so the count is never a stale page's
      let result = await send()
      if (result.replacing) {
        const n = result.replacing
        const replace = await ask({
          title: 'Replace this week?',
          body: `${weekRange(to)} already has ${shiftsLabel(n)} on it. Copying ${weekRange(from)} over the top replaces ${n === 1 ? 'it' : 'them'}, and brings that week's closed days with it.`,
          ok: 'Replace',
          danger: true,
        })
        if (!replace) return false
        result = await send(true)
      }
      if (result.error) {
        await notify("Couldn't copy the week", result.error)
        return false
      }
      if (result.report) await notify('Copied', result.report)
      return true
    } finally {
      copying.current = false
    }
  }

  return [dialog, copy] as const
}
