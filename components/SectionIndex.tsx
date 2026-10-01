'use client'

import { useEffect, useState } from 'react'

// How far down the window a section's top has to be for it to count as the one you're reading
const READING_LINE = 120

/**
 * A page's sections down its side: each a link to its anchor, with the one
 * you're reading highlighted as you scroll. A click highlights the section
 * you asked for, even one too near the foot of the page to scroll to the
 * top, until you scroll again yourself. So does arriving with one named in
 * the URL, like `/settings#trading-hours`.
 */
export function SectionIndex({ sections }: { sections: { id: string; title: string }[] }) {
  const [current, setCurrent] = useState<string | undefined>(sections[0]?.id)
  const [pinned, setPinned] = useState<string | null>(null)
  // Every save refreshes the page, which sends the list again as a new array,
  // so the effects follow the ids instead, and a save can't re-pin the URL's
  const ids = sections.map((s) => s.id).join(' ')

  useEffect(() => {
    if (pinned) return
    function track() {
      const atFoot = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (atFoot) return setCurrent(ids.split(' ').at(-1))
      let reading = ids.split(' ')[0]
      for (const id of ids.split(' ')) {
        const top = document.getElementById(id)?.getBoundingClientRect().top
        if (top !== undefined && top <= READING_LINE) reading = id
      }
      setCurrent(reading)
    }
    track()
    window.addEventListener('scroll', track, { passive: true })
    window.addEventListener('resize', track)
    return () => {
      window.removeEventListener('scroll', track)
      window.removeEventListener('resize', track)
    }
  }, [ids, pinned])

  // A section named in the URL counts as clicked, on arriving and on Back or Forward
  useEffect(() => {
    function named() {
      const id = window.location.hash.slice(1)
      if (id && ids.split(' ').includes(id)) setPinned(id)
    }
    named()
    window.addEventListener('hashchange', named)
    return () => window.removeEventListener('hashchange', named)
  }, [ids])

  // Scrolling by hand lets go of a clicked section
  useEffect(() => {
    if (!pinned) return
    const release = () => setPinned(null)
    const keys = (e: KeyboardEvent) => ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key) && release()
    window.addEventListener('wheel', release, { passive: true })
    window.addEventListener('touchmove', release, { passive: true })
    window.addEventListener('keydown', keys)
    return () => {
      window.removeEventListener('wheel', release)
      window.removeEventListener('touchmove', release)
      window.removeEventListener('keydown', keys)
    }
  }, [pinned])

  const shown = pinned ?? current
  return (
    <nav aria-label="Sections" className="sticky top-4 hidden gap-0.75 lg:grid">
      {sections.map(({ id, title }) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={id === shown ? 'location' : undefined}
          className={`rounded-control px-2.5 py-1.75 text-[12.5px] ${id === shown ? 'highlight font-semibold' : 'border border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink'}`}
          onClick={() => setPinned(id)}
        >
          {title}
        </a>
      ))}
    </nav>
  )
}
