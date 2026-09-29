'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { dayLabel } from '@/lib/roster/dates'
import { onLeaveSummary, type Leave } from '@/lib/roster/leave'
import { Popover, type PopoverTarget } from './Popover'

/**
 * What opens on a leave day: who's away and until when. Leave is the one
 * thing that blocks, so there's no shift to add and no N/A to mark, only the
 * way to the Staff page, where leave is booked.
 */
export function LeavePopover({
  target,
  leave,
  onClose,
}: {
  target: PopoverTarget
  /** The booking that has them away this day */
  leave: Leave
  onClose: (target: PopoverTarget) => void
}) {
  const { person, date, anchor } = target
  const cancel = useRef<HTMLButtonElement>(null)

  // On Cancel rather than Manage leave, so an Enter held or pressed twice to
  // open this can't carry on and take you off the roster
  useEffect(() => {
    cancel.current?.focus({ preventScroll: true })
  }, [])

  return (
    <Popover target={target} label={`${person.name} on leave, ${dayLabel(date)}`} onClose={onClose}>
      <p className="rounded-chip border border-line bg-surface-3 px-2.5 py-2 text-[12.5px] leading-[1.45] text-ink-2">
        {onLeaveSummary(leave)}
      </p>
      <p className="mt-1.75 text-[11.5px] leading-[1.45] text-ink-3">
        Shifts can&apos;t go on a leave day. Leave is booked on the Staff page.
      </p>
      <div className="mt-2.25 flex gap-1.5 border-t border-line pt-2.25 [&>.btn]:flex-1 [&>.btn]:p-1.25 [&>.btn]:text-center [&>.btn]:text-[12px]">
        <Link href="/staff#leave" className="btn">
          Manage leave
        </Link>
        <button
          ref={cancel}
          className="btn"
          onClick={() => {
            onClose(target)
            if (anchor.isConnected) anchor.focus()
          }}
        >
          Cancel
        </button>
      </div>
    </Popover>
  )
}
