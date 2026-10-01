'use client'

import { bookLeave, cancelLeave } from '@/app/actions'
import { describeLeave, type Leave } from '@/lib/roster/leave'
import { shiftsLabel } from '@/lib/roster/shifts'
import { UNREACHABLE } from './ShiftPopover'
import { useAsk } from './useAsk'

/** A booking as typed: whose, the first and last days, and why. */
export type Booking = { staffId: number; from: string; to: string; note: string }

/**
 * Booking and cancelling leave, with the questions each asks, for anywhere
 * leave is managed. A refusal goes to `onError`, and a fresh try clears the
 * last one. Render `dialog` anywhere in the component.
 */
export function useLeave(onError: (error: string | undefined) => void) {
  const [dialog, ask, choose] = useAsk()

  /**
   * True once it's booked. Over shifts, the first try comes back with how many
   * there are, and the booking only goes in once you've said what to do with
   * them. Removing them is the answer Enter gives.
   */
  async function book(booking: Booking, name: string): Promise<boolean> {
    onError(undefined) // whatever went wrong last time, this is a new try
    const send = (shifts?: 'remove' | 'keep') => bookLeave({ ...booking, shifts }).catch(() => ({ error: UNREACHABLE }))
    let result: Awaited<ReturnType<typeof send>> = await send()
    if ('clashes' in result && result.clashes) {
      const n = result.clashes
      const them = n === 1 ? 'it' : 'them'
      const choice = await choose({
        title: `Book leave over ${shiftsLabel(n)}?`,
        body: `${name} has ${shiftsLabel(n)} rostered inside that leave. Remove ${them}, or keep ${them} and have the roster warn about ${n === 1 ? 'it' : 'each'}.`,
        ok: `Remove ${shiftsLabel(n)}`,
        other: `Keep ${them}`,
        danger: true,
      })
      if (choice === 'cancel') return false
      result = await send(choice === 'ok' ? 'remove' : 'keep')
    }
    onError(result.error)
    return !result.error
  }

  async function cancel(l: Omit<Leave, 'staffId'> & { name: string }) {
    const yes = await ask({
      title: `Cancel ${l.name}'s leave?`,
      body: `${describeLeave(l)}. Those days can take shifts again.`,
      ok: 'Cancel leave',
      cancel: 'Keep it',
      danger: true,
    })
    if (yes) onError((await cancelLeave(l.id).catch(() => ({ error: UNREACHABLE }))).error)
  }

  return [dialog, book, cancel] as const
}
