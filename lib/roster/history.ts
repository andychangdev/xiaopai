// History: every week worth looking back on, so an old one can be opened or
// copied into the week you have open. Nothing here is stored: the counts and
// hours come from the shifts, like everywhere else.

import type { IsoDate } from './dates'
import { weekTotal } from './hours'
import type { PublishState } from './publish'
import type { Shift } from './shifts'
import type { Minutes } from './time'

export type HistoryRow = {
  weekStart: IsoDate
  /** The week you have open, which has nothing to open or copy */
  open: boolean
  shifts: number
  minutes: Minutes
  state: PublishState
}

/**
 * Every week with shifts on it, newest first. So is a week published and
 * emptied since, as staff still hold what went out, and the open week
 * whatever it has, since that's the one you're choosing for.
 */
export function historyRows({
  open,
  weeks,
}: {
  open: IsoDate
  /** Every week there's anything on, with where it stands on publishing. The open week needn't be one. */
  weeks: { weekStart: IsoDate; shifts: Pick<Shift, 'start' | 'end'>[]; state: PublishState }[]
}): HistoryRow[] {
  const listed = weeks.filter((w) => w.shifts.length || w.state.status === 'published' || w.weekStart === open)
  if (!listed.some((w) => w.weekStart === open)) listed.push({ weekStart: open, shifts: [], state: { status: 'draft' } })
  return listed
    .map(({ weekStart, shifts, state }) => ({
      weekStart,
      open: weekStart === open,
      shifts: shifts.length,
      minutes: weekTotal(shifts),
      state,
    }))
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
}

/** 'Draft' or 'Published · v2'. An edit since doesn't change which version went out. */
export function historyBadge(state: PublishState): string {
  return state.status === 'draft' ? 'Draft' : `Published · v${state.version}`
}
