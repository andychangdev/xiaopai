'use client'

import { bookLeave, cancelLeave, updateLeave, type ActionResult } from '@/app/actions'
import { describeLeave, type Leave } from '@/lib/roster/leave'
import { shiftsLabel } from '@/lib/roster/shifts'
import { UNREACHABLE } from './ShiftPopover'
import { useAsk } from './useAsk'

/** A booking as typed: whose, the first and last days, and why. */
export type Booking = { staffId: number; from: string; to: string; note: string }

type Send = (shifts?: 'remove' | 'keep') => Promise<ActionResult & { clashes?: number }>

/**
 * Booking, changing and cancelling leave, with the questions each asks, for
 * anywhere leave is managed. A refusal goes to `onError`, and a fresh try
 * clears the last one. Render `dialog` anywhere in the component.
 */
export function useLeave(onError: (error: string | undefined) => void) {
  const [dialog, ask, choose] = useAsk()

  /**
   * True once it's in. Over shifts, the first try comes back with how many
   * there are, and it only goes in once you've said what to do with them.
   * Removing them is the answer Enter gives.
   */
  async function overShifts(send: Send, verb: string, name: string, where: string): Promise<boolean> {
    onError(undefined) // whatever went wrong last time, this is a new try
    const attempt = (shifts?: 'remove' | 'keep') => send(shifts).catch(() => ({ error: UNREACHABLE }))
    let result: Awaited<ReturnType<typeof attempt>> = await attempt()
    if ('clashes' in result && result.clashes) {
      const n = result.clashes
      const them = n === 1 ? 'it' : 'them'
      const choice = await choose({
        title: `${verb} leave over ${shiftsLabel(n)}?`,
        body: `${name} has ${shiftsLabel(n)} rostered ${where}. Remove ${them}, or keep ${them} and have the roster warn about ${n === 1 ? 'it' : 'each'}.`,
        ok: `Remove ${shiftsLabel(n)}`,
        other: `Keep ${them}`,
        danger: true,
      })
      if (choice === 'cancel') return false
      result = await attempt(choice === 'ok' ? 'remove' : 'keep')
    }
    onError(result.error)
    return !result.error
  }

  function book(booking: Booking, name: string): Promise<boolean> {
    return overShifts((shifts) => bookLeave({ ...booking, shifts }), 'Book', name, 'inside that leave')
  }

  /** Its new days and reason. Only shifts on the days it adds are asked about. */
  function change(id: number, edit: Omit<Booking, 'staffId'>, name: string): Promise<boolean> {
    return overShifts((shifts) => updateLeave(id, { ...edit, shifts }), 'Change', name, 'on the days it adds')
  }

  /** True once it's gone. */
  async function cancel(l: Omit<Leave, 'staffId'> & { name: string }): Promise<boolean> {
    const yes = await ask({
      title: `Cancel ${l.name}'s leave?`,
      body: `${describeLeave(l)}. Those days can take shifts again.`,
      ok: 'Cancel leave',
      cancel: 'Keep it',
      danger: true,
    })
    if (!yes) return false
    const error = (await cancelLeave(l.id).catch(() => ({ error: UNREACHABLE }))).error
    onError(error)
    return !error
  }

  return [dialog, book, cancel, change] as const
}
