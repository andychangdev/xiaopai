'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

/** What the Staff page's panel can show: someone, or one booking of leave. */
export type PanelKind = 'person' | 'leave'

/** The id of whoever or whatever the panel shows, or nothing. */
export type Selected = number | null

const KINDS: PanelKind[] = ['person', 'leave']

/**
 * The Staff page's open panel, kept in the URL as `?person=3`, or `?leave=7`
 * for a booking, so a reload keeps it open. There's one panel, so opening
 * either closes the other. It goes through the browser's own history, which
 * Next follows, so opening one needs no trip to the server. Opening the
 * panel is a step Back undoes; moving from one person or booking to
 * another, or closing it, isn't.
 */
export function usePanelParam(kind: PanelKind) {
  const params = useSearchParams()
  const idOf = (k: PanelKind): Selected => {
    const raw = params.get(k)
    return raw && /^\d+$/.test(raw) ? Number(raw) : null
  }
  const selected = idOf(kind)
  const open = KINDS.some((k) => idOf(k) !== null)

  const select = useCallback(
    (next: Selected) => {
      const params = new URLSearchParams(window.location.search)
      for (const k of KINDS) params.delete(k)
      if (next !== null) params.set(kind, String(next))
      const query = params.size ? `?${params}` : ''
      const url = `${window.location.pathname}${query}${window.location.hash}`
      if (!open && next !== null) window.history.pushState(null, '', url)
      else window.history.replaceState(null, '', url)
    },
    [kind, open],
  )

  return [selected, select] as const
}
