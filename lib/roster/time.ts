// Shift times. A time is minutes since midnight (600 = 10:00), formatted as
// 24-hour HH:MM only at the edge. A shift ends after it starts and no later
// than midnight: overnight shifts aren't supported.

export type Minutes = number

const DAY_END: Minutes = 24 * 60

export const NOT_A_RANGE = 'Type the start and end, like 10-18 or 10:30-16:00.'
export const END_AFTER_START = "The end has to be after the start. Overnight shifts aren't supported."
export const PAST_MIDNIGHT = 'A shift has to finish by midnight.'

const pad = (n: number) => String(n).padStart(2, '0')

/** '10:00'. The end of the day shows as '24:00', so a shift ending then still reads forwards. */
export function formatTime(t: Minutes): string {
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`
}

/** '10:00–18:00' */
export function formatRange(start: Minutes, end: Minutes): string {
  return `${formatTime(start)}–${formatTime(end)}`
}

/** Why a start and end can't be a shift, or null when they can. */
export function timesError(start: Minutes, end: Minutes): string | null {
  const minute = (t: Minutes) => Number.isInteger(t) && t >= 0
  if (!minute(start) || !minute(end)) return NOT_A_RANGE
  if (end > DAY_END) return PAST_MIDNIGHT
  if (end <= start) return END_AFTER_START
  return null
}

// H or H:MM, then -, – or 'to', then H or H:MM
const RANGE = /^(\d{1,2})(?::(\d{2}))?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?$/i

const FIRST_START: Minutes = 7 * 60
const HALF_DAY: Minutes = 12 * 60

/**
 * A range the way the manager types it. A start hour below 7 means the
 * afternoon, and an end at or before the start moves on 12 hours at a time
 * until it's after it. Otherwise it's taken literally, as 24-hour. So '10-18'
 * and '10-6' are both 10:00–18:00, and '5-9' is 17:00–21:00.
 */
export function parseShorthand(input: string): { start: Minutes; end: Minutes } | { error: string } {
  const m = input.trim().match(RANGE)
  if (!m) return { error: NOT_A_RANGE }
  let [start, end] = [time(m[1], m[2]), time(m[3], m[4])]
  if (start === null || end === null) return { error: NOT_A_RANGE }
  if (start < FIRST_START) start += HALF_DAY
  while (end <= start) end += HALF_DAY
  const error = timesError(start, end)
  return error ? { error } : { start, end }
}

// Hours run to 24 so '18-24' can end at midnight. Anything past it, like
// 24:30, is left for timesError to refuse.
function time(hours: string, minutes = '00'): Minutes | null {
  const [h, m] = [Number(hours), Number(minutes)]
  return h <= 24 && m < 60 ? h * 60 + m : null
}
