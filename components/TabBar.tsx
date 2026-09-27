'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// `/` redirects to the right week, so the Roster tab points there, and is the
// way back to it from any other. Roster text keeps to the week on screen, and
// anywhere else lets `/share` pick one the same way.
const TABS = [
  { label: 'Roster', section: '/roster', href: () => '/' },
  { label: 'Staff', section: '/staff', href: () => '/staff' },
  { label: 'Settings', section: '/settings', href: () => '/settings' },
  { label: 'Roster text', section: '/share', href: (week?: string) => (week ? `/share/${week}` : '/share') },
]

export function TabBar() {
  const pathname = usePathname()
  const week = pathname.match(/^\/(?:roster|share)\/([^/]+)/)?.[1]
  return (
    <nav className="flex gap-0.5 rounded-control border border-line bg-surface p-0.5">
      {TABS.map((tab) => {
        const current = pathname.startsWith(tab.section)
        return (
          <Link
            key={tab.label}
            href={tab.href(week)}
            aria-current={current ? 'page' : undefined}
            className={
              current
                ? 'rounded-chip bg-accent px-3 py-[5px] font-semibold text-accent-ink'
                : 'rounded-chip px-3 py-[5px] font-medium text-ink-2 hover:text-ink'
            }
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
