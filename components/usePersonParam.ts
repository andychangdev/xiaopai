'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

/** Whose panel is open on the Staff page: someone's id, 'new' while adding someone, or nobody. */
export type Selected = number | 'new' | null

/**
 * The Staff page's open panel, kept in the URL as `?person=3` so a reload
 * keeps it open. It goes through the browser's own history, which Next
 * follows, so opening someone needs no trip to the server. Opening the panel
 * is a step Back undoes; moving from one person to another, or closing it,
 * isn't.
 */
export function usePersonParam() {
  const raw = useSearchParams().get('person')
  const selected: Selected = raw === 'new' ? 'new' : raw && /^\d+$/.test(raw) ? Number(raw) : null

  const select = useCallback(
    (next: Selected) => {
      const params = new URLSearchParams(window.location.search)
      if (next === null) params.delete('person')
      else params.set('person', String(next))
      const query = params.size ? `?${params}` : ''
      const url = `${window.location.pathname}${query}${window.location.hash}`
      if (selected === null && next !== null) window.history.pushState(null, '', url)
      else window.history.replaceState(null, '', url)
    },
    [selected],
  )

  return [selected, select] as const
}
