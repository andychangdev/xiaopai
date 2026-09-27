import type { ReactNode } from 'react'

// The admin pages' frame: a heading with a short explanation, then cards

export function PageHead({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h1>
      <p className="mt-[5px] max-w-[64ch] text-[13px] leading-normal text-ink-2">{children}</p>
    </div>
  )
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4 overflow-hidden rounded-card border border-line bg-surface">
      <h2 className="border-b border-line bg-surface-3 px-3.5 py-2.5 text-[11px] font-semibold tracking-[0.1em] text-ink-2 uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}
