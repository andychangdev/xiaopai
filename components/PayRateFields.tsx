'use client'

import { useState } from 'react'
import { setPayRate } from '@/app/actions'
import type { Percent } from '@/lib/roster/cost'
import { sectionRefusal } from './Page'
import { SaveOnBlur } from './SaveOnBlur'
import { UNREACHABLE } from './ShiftPopover'

/** The weekend and public holiday rates, each saved when you leave its box. */
export function PayRateFields({ weekend, holiday }: { weekend: Percent; holiday: Percent }) {
  const [error, setError] = useState<string>()

  const save = (day: 'weekend' | 'holiday') => async (input: string) => {
    const { error } = await setPayRate(day, input).catch(() => ({ error: UNREACHABLE }))
    setError(error)
    return error
  }

  const box = (day: 'weekend' | 'holiday', label: string, rate: Percent) => (
    <label className="flex items-center gap-2.5 text-[13px]">
      {label}
      <SaveOnBlur
        className="field w-18.5 font-mono tabular-nums"
        inputMode="numeric"
        value={`${rate}%`}
        onSave={save(day)}
      />
    </label>
  )

  return (
    <>
      <div className="flex flex-wrap gap-x-7 gap-y-3">
        {box('weekend', 'Weekends', weekend)}
        {box('holiday', 'Public holidays', holiday)}
      </div>
      {error && (
        <p role="alert" className={sectionRefusal}>
          {error}
        </p>
      )}
    </>
  )
}
