'use client'

import { useState } from 'react'
import type { LeaveListRow } from '@/lib/db/queries'
import { LeaveForm } from './LeaveForm'
import { PanelHead, SidePanel } from './SidePanel'
import { useLeave } from './useLeave'

/**
 * One booking, in the Staff page's panel: its days and reason, to change,
 * and Cancel leave. Shifts on days a change adds are asked about as when
 * booking. Saving or cancelling it closes the panel, as do Esc, Cancel and a
 * click outside, which save nothing.
 */
export function LeavePanel({
  leave: l,
  onClose,
  onDismiss,
  className,
}: {
  leave: LeaveListRow
  /** Closed with Esc, ×, Cancel, or once it's saved */
  onClose: () => void
  /** Closed by a click somewhere else, which keeps the focus it gives */
  onDismiss: () => void
  /** Where the page puts it beside the lists */
  className?: string
}) {
  const [error, setError] = useState<string>()
  const [dialog, , cancel, change] = useLeave(setError)
  const title = `${l.name}'s leave`

  return (
    <SidePanel label={title} onClose={onClose} onDismiss={onDismiss} className={className}>
      <PanelHead title={title} onClose={onClose} />
      <div className="grid gap-3.5 px-3.5 py-3.5">
        <LeaveForm leave={l} onSave={(b) => change(l.id, b, l.name)} onDone={onClose} />
        <p className="text-[11.5px] leading-snug text-ink-3">
          Leave blocks rostering on those days. Moving it over shifts already rostered asks what to do with them.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line px-3.5 py-2.5">
        <button className="text-link text-crit-deep" onClick={async () => (await cancel(l)) && onClose()}>
          Cancel leave
        </button>
        <span className="text-[11px] text-ink-3">Those days can take shifts again</span>
      </div>
      {error && (
        <p role="alert" className="border-t border-line px-3.5 py-2.5 text-[12.5px] text-crit-deep">
          {error}
        </p>
      )}
      {dialog}
    </SidePanel>
  )
}
