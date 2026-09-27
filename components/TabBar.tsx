'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// `/` redirects to the right week, so the Roster tab points there, and is the
// way back to it from any other. Share roster is the roster's own page,
// opened from its header, so it counts as the Roster tab.
const TABS = [
  { label: 'Roster', sections: ['/roster', '/share'], href: '/' },
  { label: 'Staff', sections: ['/staff'], href: '/staff' },
  { label: 'Settings', sections: ['/settings'], href: '/settings' },
]

export function TabBar() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-0.5 rounded-control border border-line bg-surface p-0.5">
      {TABS.map((tab) => {
        const current = tab.sections.some((section) => pathname.startsWith(section))
        return (
          <Link
            key={tab.label}
            href={tab.href}
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
