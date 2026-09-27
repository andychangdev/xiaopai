'use client'

import { addDays, type IsoDate } from '@/lib/roster/dates'
import { useCopyWeek } from './useCopyWeek'

/** Fills the week from the one before, with useCopyWeek's confirm and report. */
export function CopyPreviousWeek({
  week,
  previousShifts,
}: {
  week: IsoDate
  /** How many shifts the week before has */
  previousShifts: number
}) {
  const [dialog, copy] = useCopyWeek()
  return (
    <>
      <button className="btn" onClick={() => copy({ from: addDays(week, -7), to: week, fromShifts: previousShifts })}>
        Copy previous week
      </button>
      {dialog}
    </>
  )
}
