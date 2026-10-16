'use client'

import { animate, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useLayoutEffect, useRef } from 'react'
import { isMonday } from '@/lib/roster/dates'
import { CalendarIcon, GearIcon, HistoryIcon, PeopleIcon } from './Icons'

// `/` redirects to the right week, so Roster points there, and is the way
// back to it from any other page. Share roster is the roster's own page,
// opened from the Week summary, so it counts as Roster.
const PAGES = [
  { label: 'Roster', sections: ['/roster', '/share'], href: '/', icon: <CalendarIcon /> },
  { label: 'History', sections: ['/history'], href: '/history', icon: <HistoryIcon /> },
  { label: 'Staff', sections: ['/staff'], href: '/staff', icon: <PeopleIcon /> },
  { label: 'Settings', sections: ['/settings'], href: '/settings', icon: <GearIcon /> },
]

/**
 * History is a page of its own, so the week on the grid or Share roster goes
 * along to it as the week you have open, and Roster takes you back to that
 * week rather than to `/`.
 */
function carryingOpenWeek(href: string, pathname: string, search: URLSearchParams): string {
  const [, section, param] = pathname.split('/')
  const week = section === 'history' ? search.get('week') : section === 'roster' || section === 'share' ? param : null
  if (!week || !isMonday(week)) return href
  if (href === '/history') return `/history?week=${week}`
  if (href === '/' && section === 'history') return `/roster/${week}`
  return href
}

/**
 * The way round the app: a rail down the left, with the business at its head
 * and Settings at its foot. On a phone it's a bar along the bottom with the
 * same four. The page you're on has the highlight, which slides across to
 * the next one you go to.
 */
export function Sidebar({ businessName, initial }: { businessName: string; initial: string }) {
  const pathname = usePathname()
  const search = useSearchParams()
  const here = PAGES.find((page) => page.sections.some((section) => pathname.startsWith(section)))?.label
  const nav = useRef<HTMLElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  const was = useRef(here)
  const still = useReducedMotion()

  // Off to the new page, the highlight starts from the link it was on. Where
  // that is on screen, rather than on the page, as the rail stays put while
  // the page scrolls, and going to a page scrolls back to its top.
  useLayoutEffect(() => {
    const from = was.current
    was.current = here
    const old = nav.current?.querySelector(`[data-page="${from}"]`)?.getBoundingClientRect()
    const now = pill.current?.parentElement?.getBoundingClientRect()
    if (from === here || still || !old || !now) return
    animate(pill.current!, { x: [old.left - now.left, 0], y: [old.top - now.top, 0] }, { type: 'spring', bounce: 0.15, duration: 0.4 })
  }, [here, still])

  return (
    <nav
      ref={nav}
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t border-line bg-surface px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+6px)] sm:sticky sm:inset-auto sm:top-0 sm:h-dvh sm:flex-col sm:items-center sm:self-start sm:border-t-0 sm:border-r sm:px-0 sm:pt-3.5 sm:pb-3"
    >
      <div className="hidden w-13 justify-items-center gap-1.25 border-b border-line pb-3.5 sm:mb-2.5 sm:grid">
        <span
          aria-hidden
          className="grid size-7.5 place-items-center rounded-control bg-primary text-[14px] font-bold text-primary-ink"
        >
          {initial}
        </span>
        <span title={businessName} className="line-clamp-2 w-full text-center text-[10.5px] leading-tight font-semibold wrap-break-word">
          {businessName}
        </span>
      </div>
      {PAGES.map((page) => {
        const current = page.label === here
        return (
          <Link
            key={page.label}
            data-page={page.label}
            href={carryingOpenWeek(page.href, pathname, search)}
            aria-current={current ? 'page' : undefined}
            className={`relative flex flex-1 flex-col items-center gap-0.75 rounded-control border border-transparent py-1.5 text-[10.5px] sm:w-14.5 sm:flex-none sm:py-2 ${page.label === 'Settings' ? 'sm:mt-auto' : ''} ${current ? 'font-semibold text-accent-deep' : 'font-medium text-ink-2 hover:bg-surface-2 hover:text-ink'}`}
          >
            {/* Under the rail's z-index rather than the link's, so it slides beneath the others' labels */}
            {current && <span ref={pill} aria-hidden className="highlight absolute -inset-px -z-10 rounded-control" />}
            {page.icon}
            {page.label}
          </Link>
        )
      })}
    </nav>
  )
}
