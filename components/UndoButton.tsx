'use client'

import { useCallback, useEffect, useRef } from 'react'
import { undo } from '@/app/actions'
import type { IsoDate } from '@/lib/roster/dates'
import { actionError } from './ShiftPopover'
import { useAsk } from './useAsk'

/**
 * Takes back the week's last grid action, Clear week and Copy previous week
 * included, and again for the one before. ⌘Z (Ctrl+Z) does the same, unless
 * you're typing or a popover or dialog is open. Greyed out when there's
 * nothing to undo; otherwise its tooltip names what it would take back.
 */
export function UndoButton({
  week,
  last,
}: {
  week: IsoDate
  /** What Undo would take back, like 'clearing the week', or null for nothing */
  last: string | null
}) {
  const [dialog, ask] = useAsk()
  // One at a time, so a click while one is on its way can't take back an action you never saw named
  const undoing = useRef(false)

  const run = useCallback(async () => {
    if (undoing.current) return
    undoing.current = true
    const error = await actionError(() => undo(week))
    undoing.current = false
    if (error) await ask({ title: "Couldn't undo", body: error, ok: 'OK', cancel: null })
  }, [week, ask])

  useEffect(() => {
    if (!last) return
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'z') {
        return
      }
      // Holding the keys down is one undo, not one per repeat
      if (e.repeat) return
      // Typing has its own undo, and a popover or dialog is about something else
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return
      if (document.querySelector('dialog[open], [role="dialog"]')) return
      e.preventDefault()
      run()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [last, run])

  return (
    <>
      <button
        className="btn disabled:cursor-default disabled:opacity-50 disabled:hover:border-line"
        disabled={!last}
        title={last ? `Undo ${last} (⌘Z)` : 'Nothing to undo'}
        // A double click is one undo, not two
        onClick={(e) => e.detail < 2 && run()}
      >
        Undo
      </button>
      {dialog}
    </>
  )
}
