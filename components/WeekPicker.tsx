'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { addDays, weekRange, weekTitle, type IsoDate } from '@/lib/roster/dates'
import type { WeekMenuItem } from '@/lib/roster/weekMenu'
import { WeekState } from './WeekState'

// The week buttons, as tall as each other
const weekButton = 'grid h-8.5 flex-none place-items-center rounded-control border border-line bg-surface text-ink-2'
const weekLink = `${weekButton} hover:border-line-strong hover:text-ink`

/**
 * The roster's week control: Today, then ‹ and › either side of the week's
 * dates. The dates open a menu of the weeks around the open one, each with where
 * it stands, and the way on to History for the rest. In the menu the arrow
 * keys move, Enter opens a week, and Esc closes it.
 */
export function WeekPicker({ week, thisWeek, items }: { week: IsoDate; thisWeek: IsoDate; items: WeekMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()

  const links = () => [...(menu.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])]

  // Opening puts you on the week you're looking at, so the arrows go from there
  useEffect(() => {
    if (open) (menu.current?.querySelector<HTMLAnchorElement>('a[aria-current]') ?? links()[0])?.focus()
  }, [open])

  // A click anywhere else closes it
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  function close() {
    setOpen(false)
    button.current?.focus()
  }

  function onMenuKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    const all = links()
    const at = all.indexOf(document.activeElement as HTMLAnchorElement)
    const moves: Record<string, number> = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: all.length - 1 }
    const to = moves[e.key]
    if (to === undefined) return
    e.preventDefault() // rather than scroll the page
    all[Math.max(0, Math.min(all.length - 1, to))]?.focus()
  }

  return (
    <div
      ref={wrap}
      className="relative flex w-full items-center gap-1.5 sm:w-auto"
      // Tabbing out closes it. A blur to nowhere is a click, which Safari doesn't
      // focus on, and clicks outside are the pointerdown's to close.
      onBlur={(e) => {
        if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <Today week={thisWeek} here={week === thisWeek} />
      <WeekArrow href={`/roster/${addDays(week, -7)}`} label="Previous week">
        ‹
      </WeekArrow>
      <h1 className="min-w-0 flex-1 sm:flex-none">
        <button
          ref={button}
          aria-expanded={open}
          aria-controls={id}
          title="Pick another week"
          className={`flex h-8.5 w-full items-center justify-between gap-2.5 rounded-control border bg-surface px-3 text-[17px] font-semibold tracking-[-0.01em] ${open ? 'border-accent' : 'border-line hover:border-line-strong'}`}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && !open) {
              e.preventDefault()
              setOpen(true)
            }
          }}
        >
          <span className="truncate">{weekTitle(week)}</span>
          <svg
            aria-hidden
            width="10"
            height="6"
            viewBox="0 0 10 6"
            className={`flex-none text-ink-2 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h1>
      <WeekArrow href={`/roster/${addDays(week, 7)}`} label="Next week">
        ›
      </WeekArrow>
      {open && (
        <div
          ref={menu}
          id={id}
          className="absolute top-full left-0 z-30 mt-1.5 w-80 max-w-[calc(100vw-32px)] rounded-card border border-line-strong bg-surface p-1.5 shadow-popover"
          onKeyDown={onMenuKey}
        >
          <ul aria-label="Weeks">
            {items.map((item) => (
              <li key={item.weekStart}>
                <Link
                  href={`/roster/${item.weekStart}`}
                  aria-current={item.open ? 'page' : undefined}
                  className={`flex items-center justify-between gap-3 rounded-chip px-2.5 py-1.75 text-[13px] ${item.open ? 'highlight' : 'border border-transparent hover:bg-surface-3 focus-visible:bg-surface-3'}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="min-w-0">
                    <span className={`block whitespace-nowrap ${item.open ? 'font-semibold' : ''}`}>
                      {weekRange(item.weekStart)}
                    </span>
                    <span className={`block text-[11px] ${item.open ? '' : 'text-ink-3'}`}>{item.label}</span>
                  </span>
                  <WeekState state={item.state} />
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/history?week=${week}`}
            className="mt-1.5 flex items-center justify-between rounded-chip border-t border-line px-2.5 pt-2.25 pb-1.75 text-[12.5px] font-semibold text-accent-deep hover:bg-surface-3"
            onClick={() => setOpen(false)}
          >
            All weeks in History
            <span aria-hidden>→</span>
          </Link>
        </div>
      )}
    </div>
  )
}

function WeekArrow({ href, label, children }: { href: string; label: string; children: string }) {
  return (
    <Link href={href} title={label} aria-label={label} className={`${weekLink} w-8.5 text-[15px]`}>
      {children}
    </Link>
  )
}

/** Back to the week with today in it, from wherever you are. Greyed out once you're there. */
function Today({ week, here }: { week: IsoDate; here: boolean }) {
  const size = 'px-2.5 text-[12.5px] font-medium whitespace-nowrap'
  if (here) {
    return (
      <button disabled className={`${weekButton} ${size} opacity-50`}>
        Today
      </button>
    )
  }
  return (
    <Link href={`/roster/${week}`} title={`Go to this week, ${weekRange(week)}`} className={`${weekLink} ${size}`}>
      Today
    </Link>
  )
}
