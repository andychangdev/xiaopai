import type { ReactNode } from 'react'

// The admin pages' frame: a heading with a short explanation, then cards

/** `action` is the page's own button, at the right of the heading. */
export function PageHead({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2.5">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h1>
        <p className="mt-1.25 max-w-[64ch] text-[13px] leading-normal text-ink-2">{children}</p>
      </div>
      {action}
    </div>
  )
}

/** `id` lets another page link straight to the card. */
export function Card({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-4 scroll-mt-4 overflow-hidden rounded-card border border-line bg-surface">
      <h2 className="border-b border-line bg-surface-3 px-3.5 py-2.5 text-[11px] font-semibold tracking-widest text-ink-2 uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * One part of a page made of sections, like Settings: its title and a line
 * on what it's for, then its controls. Beside each other once the card is
 * wide enough, the title above otherwise. The card is the container the
 * width is measured against.
 */
export function Section({ id, title, note, children }: { id: string; title: string; note: ReactNode; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="grid scroll-mt-4 gap-x-6 gap-y-3 border-b border-line px-5 py-4.5 last:border-b-0 @3xl:grid-cols-[200px_minmax(0,1fr)]"
    >
      <div>
        <h2 id={`${id}-title`} className="text-[14px] font-semibold">
          {title}
        </h2>
        <p className="mt-1 max-w-[52ch] text-[12px] leading-snug text-ink-2">{note}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

/** What a control in a Section says when it refuses a change. */
export const sectionRefusal = 'mt-2.5 text-[12.5px] text-crit-deep'

// The box a wide admin table scrolls sideways in. Positioned, so the sr-only
// labels in its cells stay inside it rather than widening the page.
export const tableScroll = 'relative overflow-x-auto'

// The admin tables' header and body cells
export const th =
  'border-b border-line px-3 py-2.25 text-left text-[10.5px] font-semibold tracking-[0.09em] text-ink-3 uppercase'
export const td = 'border-b border-line px-3 py-1.75 align-middle text-[13px]'
