'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { publishWeek } from '@/app/actions'
import type { IsoDate } from '@/lib/roster/dates'
import {
  NOTHING_TO_PUBLISH,
  needsPublishing,
  nothingToPublish,
  publishQuestion,
  type PublishState,
} from '@/lib/roster/publish'
import type { Minutes } from '@/lib/roster/time'
import { UNREACHABLE } from './ShiftPopover'
import { useAsk } from './useAsk'

/**
 * Publish roster for a draft, Publish update once it's been edited since, and
 * nothing in between. Publishing asks first, naming what's going out and any
 * warnings, which never stop it, then opens Share roster to copy.
 */
export function PublishButton({
  week,
  state,
  shifts,
  minutes,
  warnings,
  today,
}: {
  week: IsoDate
  state: PublishState
  /** How many shifts the week has, and their hours */
  shifts: number
  minutes: Minutes
  /** How many warnings are outstanding */
  warnings: number
  today: IsoDate
}) {
  const [dialog, ask] = useAsk()
  const router = useRouter()
  // With the dialog up, a second click can't happen, but a slow publish, or
  // the moment before Share roster opens, could be clicked again
  const publishing = useRef(false)
  const notify = (title: string, body: string) => ask({ title, body, ok: 'OK', cancel: null })

  if (!needsPublishing(state)) return null

  async function publish() {
    if (publishing.current) return
    if (nothingToPublish(state, shifts)) {
      await notify('Nothing to publish', NOTHING_TO_PUBLISH)
      return
    }
    if (!(await ask(publishQuestion({ weekStart: week, state, shifts, minutes, warnings, today })))) return

    publishing.current = true
    const result = await publishWeek(week).catch(() => ({ error: UNREACHABLE }))
    if (result.error) {
      publishing.current = false
      await notify("Couldn't publish", result.error)
    } else {
      router.push(`/share/${week}`) // publishing stays set: this page is on its way out
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={publish}>
        {state.status === 'draft' ? 'Publish roster' : 'Publish update'}
      </button>
      {dialog}
    </>
  )
}
