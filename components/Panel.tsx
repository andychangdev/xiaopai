import type { ReactNode } from 'react'

/** A titled box below the roster grid, like the Week summary. */
export function Panel({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <h2 className="flex items-center gap-1.75 border-b border-line bg-surface-3 px-3 py-2.5 text-[11px] font-semibold tracking-widest text-ink-2 uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}
