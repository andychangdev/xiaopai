'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { isMonday } from '@/lib/roster/dates'

// `/` redirects to the right week, so the Roster tab points there, and is the
// way back to it from any other. Share roster is the roster's own page,
// opened from its header, so it counts as the Roster tab.
const TABS = [
  { label: 'Roster', sections: ['/roster', '/share'], href: '/' },
  { label: 'Staff', sections: ['/staff'], href: '/staff' },
  { label: 'Settings', sections: ['/settings'], href: '/settings' },
  { label: 'History', sections: ['/history'], href: '/history' },
]

/**
 * History is a page of its own, so the week on the grid or Share roster goes
 * along to it as the week you have open, and the Roster tab takes you back
 * to that week rather than to `/`.
 */
function carryingOpenWeek(href: string, pathname: string, search: URLSearchParams): string {
  const [, section, param] = pathname.split('/')
  const week = section === 'history' ? search.get('week') : section === 'roster' || section === 'share' ? param : null
  if (!week || !isMonday(week)) return href
  if (href === '/history') return `/history?week=${week}`
  if (href === '/' && section === 'history') return `/roster/${week}`
  return href
}

export function TabBar() {
  const pathname = usePathname()
  const search = useSearchParams()
  return (
    <nav className="flex gap-0.5 rounded-control border border-line bg-surface p-0.5">
      {TABS.map((tab) => {
        const current = tab.sections.some((section) => pathname.startsWith(section))
        return (
          <Link
            key={tab.label}
            href={carryingOpenWeek(tab.href, pathname, search)}
            aria-current={current ? 'page' : undefined}
            className={
              current
                ? 'rounded-chip bg-accent-bg px-3 py-1.25 font-semibold text-accent-deep inset-ring inset-ring-accent-line'
                : 'rounded-chip px-3 py-1.25 font-medium text-ink-2 hover:text-ink'
            }
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
