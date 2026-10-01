import type { ReactNode } from 'react'

/** Icons drawn to match the undo arrow: a 16px box, stroked in the text colour. */
function Icon({ children, size = 14 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      width={size}
      height={size}
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

/** A circled i, for a note on how something was worked out. */
export function InfoIcon() {
  return (
    <Icon>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 7.25v3.75" />
      <circle cx="8" cy="5" r="0.9" fill="currentColor" stroke="none" />
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

/** Two columns of dots, for something that drags. */
export function GripIcon() {
  return (
    <Icon>
      {[4, 8, 12].map((y) =>
        [6, 10].map((x) => <circle key={`${x},${y}`} cx={x} cy={y} r="1.2" fill="currentColor" stroke="none" />),
      )}
    </Icon>
  )
}

// The sidebar's, a size up, as each sits over a label

/** A page of the calendar, for the roster. */
export function CalendarIcon() {
  return (
    <Icon size={18}>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.75h11M5.5 2v3M10.5 2v3" />
    </Icon>
  )
}

/** A clock wound back, for the weeks gone by. */
export function HistoryIcon() {
  return (
    <Icon size={18}>
      <path d="M2.9 9.5A5.25 5.25 0 1 0 4.3 4.3" />
      <path d="M2.5 2.25v3h3" />
      <path d="M8 5.25V8l2 1.25" />
    </Icon>
  )
}

/** Two people, for the staff. */
export function PeopleIcon() {
  return (
    <Icon size={18}>
      <circle cx="6" cy="5.5" r="2.25" />
      <path d="M1.75 13.5c.5-2.25 2.2-3.5 4.25-3.5s3.75 1.25 4.25 3.5" />
      <circle cx="11.25" cy="6" r="1.75" />
      <path d="M11 9.75c1.6.1 2.8 1.1 3.25 2.9" />
    </Icon>
  )
}

/** A cog, for settings. */
export function GearIcon() {
  return (
    <Icon size={18}>
      <circle cx="8" cy="8" r="2" />
      <circle cx="8" cy="8" r="4.25" />
      <path d="M8 1.75v2M8 12.25v2M1.75 8h2M12.25 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M3.6 12.4 5 11M11 5l1.4-1.4" />
    </Icon>
  )
}
