'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { CrossIcon } from './Icons'

/**
 * The Staff page's panel: beside the list, or on a narrow screen a sheet
 * over it. Esc, × or a click outside closes it.
 */
export function SidePanel({
  label,
  onClose,
  onDismiss,
  children,
}: {
  /** What it's for, for a screen reader */
  label: string
  /** Closed with Esc or × */
  onClose: () => void
  /** Closed by a click somewhere else, which keeps the focus it gives */
  onDismiss: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)

  // A click anywhere else closes it, though not one that opens someone (their
  // line or a leave bar), which moves it on to them instead. A box
  // being typed in is left first, so what's in it saves.
  useEffect(() => {
    const away = (e: PointerEvent) => {
      const target = e.target as Element
      if (ref.current?.contains(target) || target.closest?.('[data-keeps-panel]')) return
      const typing = document.activeElement
      if (typing instanceof HTMLElement && ref.current?.contains(typing)) typing.blur()
      onDismiss()
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [onDismiss])

  // Coming in, focus comes too, unless a box in it has already taken it
  useEffect(() => {
    const box = ref.current
    if (box && !box.contains(document.activeElement)) box.focus({ preventScroll: true })
  }, [])

  return (
    <>
      {/* The sheet's backdrop, which a click closes like anywhere else; beside the list there's none */}
      <div aria-hidden className="fixed inset-0 z-50 bg-scrim lg:hidden" />
      <section
        ref={ref}
        tabIndex={-1}
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t border-line-strong bg-surface pb-[env(safe-area-inset-bottom)] shadow-dialog outline-none lg:sticky lg:top-4 lg:z-auto lg:mt-13 lg:max-h-[calc(100dvh-32px)] lg:rounded-card lg:border lg:border-line lg:pb-0 lg:shadow-popover"
        onKeyDown={(e) => {
          // In a box, Esc abandons the edit; in a dialog, it answers no
          const target = e.target as HTMLElement
          if (e.key !== 'Escape' || target.closest('input, select, textarea, dialog')) return
          onClose()
        }}
      >
        <div aria-hidden className="mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong lg:hidden" />
        {children}
      </section>
    </>
  )
}

/** The panel's title, with what else goes at its top, and ×. */
export function PanelHead({ title, onClose, children }: { title: string; onClose: () => void; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-3.5 py-3">
      <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</h2>
      {children}
      <button
        aria-label="Close"
        title="Close (Esc)"
        className="grid size-7 place-items-center rounded-control text-ink-3 hover:bg-surface-2 hover:text-ink"
        onClick={onClose}
      >
        <CrossIcon />
      </button>
    </div>
  )
}
