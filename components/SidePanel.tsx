'use client'

import { motion, useDragControls, useIsPresent } from 'motion/react'
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { CrossIcon } from './Icons'

// Below Tailwind's lg, where the panel is a sheet
const SHEET = '(width < 64rem)'

function subscribe(changed: () => void) {
  const query = matchMedia(SHEET)
  query.addEventListener('change', changed)
  return () => query.removeEventListener('change', changed)
}

/**
 * The Staff page's panel, for someone or for one booking: beside the lists,
 * or on a narrow screen a sheet over them. Esc, × or a click outside closes
 * it. The sheet slides up from the foot of the screen, and a swipe down on
 * its top, the grip or the heading, sends it back down.
 */
export function SidePanel({
  label,
  onClose,
  onDismiss,
  className = '',
  children,
}: {
  /** What it's for, for a screen reader */
  label: string
  /** Where the page puts it beside the lists */
  className?: string
  /** Closed with Esc or × */
  onClose: () => void
  /** Closed by a click somewhere else, which keeps the focus it gives */
  onDismiss: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const sheet = useSyncExternalStore(subscribe, () => matchMedia(SHEET).matches, () => false)
  const controls = useDragControls()
  const present = useIsPresent()

  // A click anywhere else closes it, though not one that opens someone or a
  // booking (their line or a leave bar), which moves it on to them instead.
  // A box being typed in is left first, so what's in it saves.
  // Not while it's closing, when a click could be on the panel taking its place
  useEffect(() => {
    if (!present) return
    const away = (e: PointerEvent) => {
      const target = e.target as Element
      if (ref.current?.contains(target) || target.closest?.('[data-keeps-panel]')) return
      const typing = document.activeElement
      if (typing instanceof HTMLElement && ref.current?.contains(typing)) typing.blur()
      onDismiss()
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [onDismiss, present])

  // Coming in, focus comes too, unless a box in it has already taken it
  useEffect(() => {
    const box = ref.current
    if (box && !box.contains(document.activeElement)) box.focus({ preventScroll: true })
  }, [])

  return (
    <>
      {/* The sheet's backdrop, which a click closes like anywhere else; beside the list there's none */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-scrim lg:hidden"
      />
      <motion.section
        ref={ref}
        tabIndex={-1}
        aria-label={label}
        initial={sheet ? { y: '100%' } : { opacity: 0, y: 8 }}
        animate={sheet ? { y: 0 } : { opacity: 1, y: 0 }}
        exit={sheet ? { y: '100%' } : { opacity: 0, y: 8 }}
        // Beside the lists, the app's usual timing: an explicit undefined would lose it
        {...(sheet && { transition: { type: 'spring', bounce: 0, duration: 0.35 } })}
        drag={sheet && 'y'}
        dragControls={controls}
        dragListener={false}
        // Down only, and back up if it isn't let go far enough or fast enough to close
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 1 }}
        // Stiff enough to settle right back in place, as the grid's chips do
        dragTransition={{ bounceStiffness: 600, bounceDamping: 40 }}
        onDragEnd={(_, { offset, velocity }) => (offset.y > 100 || velocity.y > 500) && onClose()}
        onPointerDown={(e) => {
          if (sheet && (e.target as Element).closest('[data-grip]')) controls.start(e)
        }}
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t border-line-strong bg-surface pb-[env(safe-area-inset-bottom)] shadow-dialog outline-none lg:sticky lg:top-4 lg:z-auto lg:mt-13 lg:max-h-[calc(100dvh-32px)] lg:rounded-card lg:border lg:border-line lg:pb-0 lg:shadow-popover ${className}`}
        onKeyDown={(e) => {
          // In a box, Esc abandons the edit; in a dialog, it answers no
          const target = e.target as HTMLElement
          if (e.key !== 'Escape' || target.closest('input, select, textarea, dialog')) return
          onClose()
        }}
      >
        <div aria-hidden data-grip className="touch-none pt-2 pb-1 lg:hidden">
          <div className="mx-auto h-1 w-9 rounded-full bg-line-strong" />
        </div>
        {children}
      </motion.section>
    </>
  )
}

/** The panel's title, with what else goes at its top, and ×. On a sheet, it's what a swipe down closes it by. */
export function PanelHead({ title, onClose, children }: { title: string; onClose: () => void; children?: ReactNode }) {
  return (
    <div data-grip className="flex items-center gap-3 border-b border-line px-3.5 py-3 max-lg:touch-none">
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
