import type { ReactNode } from 'react'

/** Icons drawn to match the undo arrow: a 16px box, stroked in the text colour. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

/** A bin, for removing something for good. */
export function TrashIcon() {
  return (
    <Icon>
      <path d="M2.5 4h11" />
      <path d="M6 4V2.5h4V4" />
      <path d="M3.75 4l.75 9.5h7l.75-9.5" />
      <path d="M6.5 7v4M9.5 7v4" />
    </Icon>
  )
}

/** A cross, for calling something off. */
export function CrossIcon() {
  return (
    <Icon>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Icon>
  )
}
