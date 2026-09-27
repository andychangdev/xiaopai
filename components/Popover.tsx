'use client'

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

const GAP = 6
const MARGIN = 8

/**
 * The small box that opens on a grid cell, headed with whose day it is. Esc,
 * a click anywhere else or tabbing out closes it, and Esc hands focus back to
 * the cell like a dialog would.
 */
export function Popover({
  anchor,
  label,
  heading,
  onClose,
  children,
}: {
  /** The cell or chip it opened from */
  anchor: HTMLElement
  /** What it's for, for a screen reader */
  label: string
  heading: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [onClose])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className="fixed z-50 max-h-[calc(100vh-16px)] w-[250px] overflow-y-auto rounded-card border border-line-strong bg-surface p-[11px] shadow-popover"
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        onClose()
        if (anchor.isConnected) anchor.focus()
      }}
      onBlur={(e) => {
        // Tabbing out closes it. Clicks elsewhere are the pointerdown's job.
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) onClose()
      }}
    >
      <h3 className="mb-[7px] text-[11px] font-semibold tracking-[0.09em] text-ink-3 uppercase">{heading}</h3>
      {children}
    </div>
  )
}
