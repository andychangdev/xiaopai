import type { ReactNode } from 'react'

// The admin pages' frame: a heading, then cards

export function PageHead({ title }: { title: string }) {
  return <h1 className="mb-4 text-[30px] leading-tight font-semibold tracking-[-0.02em]">{title}</h1>
}

/**
 * The heading over one of a page's lists, like People or Upcoming leave, with
 * the list's own button, if it has one, at the right. `id` is the title's,
 * for the list to be labelled by.
 */
export function ListHead({ id, title, action }: { id: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex min-h-8.75 items-center justify-between gap-4">
      <h2 id={id} className="text-[15px] font-semibold">
        {title}
      </h2>
      {action}
    </div>
  )
}

/** `id` lets another page link straight to the card. The last on a page leaves the bottom to the page padding. */
export function Card({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-4 scroll-mt-4 overflow-hidden last:mb-0 rounded-card border border-line bg-surface">
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
