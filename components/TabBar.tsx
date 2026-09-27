'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// `/` redirects to the right week, so the Roster tab points there
const TABS = [
  { label: 'Roster', href: '/', section: '/roster' },
  { label: 'Staff', href: '/staff', section: '/staff' },
]

export function TabBar() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-0.5 rounded-control border border-line bg-surface p-0.5">
      {TABS.map((tab) => {
        const current = pathname.startsWith(tab.section)
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
