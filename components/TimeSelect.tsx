'use client'

import { useOptimistic, useTransition } from 'react'
import { formatTime, timeOptions, type Minutes } from '@/lib/roster/time'

/**
 * A drop-down of half-hour times that saves as soon as you pick one. It shows
 * your pick straight away, and goes back to the stored time if the save is
 * refused.
 */
export function TimeSelect({
  value,
  onSave,
  label,
}: {
  value: Minutes
  onSave: (t: Minutes) => Promise<unknown>
  label: string
}) {
  const [shown, setShown] = useOptimistic(value)
  const [, startTransition] = useTransition()

  return (
    <select
      aria-label={label}
      value={shown}
      onChange={(e) => {
        const t = Number(e.target.value)
        startTransition(async () => {
          setShown(t)
          await onSave(t)
        })
      }}
      className="field w-auto min-w-23 font-mono text-[12.5px] tabular-nums"
    >
      {timeOptions(value).map((t) => (
        <option key={t} value={t}>
          {formatTime(t)}
        </option>
      ))}
    </select>
  )
}
