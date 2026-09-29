'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { dayLabel, type IsoDate } from '@/lib/roster/dates'
import type { Leave } from '@/lib/roster/leave'
import type { NaReason } from '@/lib/roster/notAvailable'
import type { Shift } from '@/lib/roster/shifts'
import { firstName } from '@/lib/roster/staff'

/**
 * The cell a popover is for, why it shows N/A if it does, the leave the
 * person's on if they are, and the shift in it when a chip opened it.
 */
export type PopoverTarget = {
  person: { id: number; name: string }
  date: IsoDate
  na: NaReason | null
  leave?: Leave
  shift?: Shift
  anchor: HTMLElement
}

const GAP = 6
const MARGIN = 8

/**
 * The small box that opens on a grid cell, headed with whose day it is. Esc,
 * a click anywhere else, a click on the cell again or tabbing out closes it,
 * and Esc hands focus back to the cell like a dialog would.
 */
export function Popover({
  target,
  label,
  onClose,
  children,
}: {
  target: PopoverTarget
  /** What it's for, for a screen reader */
  label: string
  onClose: (target: PopoverTarget) => void
  children: ReactNode
}) {
  const { person, date, anchor } = target
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => onClose(target), [onClose, target])

  // Below the cell, or above it if there's no room, kept inside the window.
  // It's fixed, so it's placed again whenever the cell moves (the grid
  // scrolls sideways) or what's inside changes its height.
  useLayoutEffect(() => {
    const box = ref.current!
    function place() {
      const r = anchor.getBoundingClientRect()
      const { clientWidth: vw, clientHeight: vh } = document.documentElement // not counting scrollbars
      const { offsetWidth: w, offsetHeight: h } = box
      box.style.left = `${Math.max(MARGIN, Math.min(vw - w - MARGIN, r.left))}px`
      box.style.top = `${r.bottom + GAP + h + MARGIN > vh ? Math.max(MARGIN, r.top - GAP - h) : r.bottom + GAP}px`
    }
    place()
    const resized = new ResizeObserver(place)
    resized.observe(box)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      resized.disconnect()
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchor])

  // Not on the cell that opened it: clicking that again is the grid's to
  // close, and closing here first would have the click open it again
  useEffect(() => {
    const away = (e: PointerEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !anchor.contains(t)) close()
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [close, anchor])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className="fixed z-50 max-h-[calc(100vh-16px)] w-62.5 overflow-y-auto rounded-card border border-line-strong bg-surface p-2.75 shadow-popover"
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        close()
        if (anchor.isConnected) anchor.focus()
      }}
      onBlur={(e) => {
        // Tabbing out closes it. Clicks elsewhere are the pointerdown's job,
        // and a click on the cell that opened it, which focuses it, the grid's.
        const to = e.relatedTarget
        if (to && !e.currentTarget.contains(to) && !anchor.contains(to)) close()
      }}
    >
      <h3 className="mb-1.75 text-[11px] font-semibold tracking-[0.09em] text-ink-3 uppercase">
        {firstName(person.name)} · {dayLabel(date)}
      </h3>
      {children}
    </div>
  )
}
