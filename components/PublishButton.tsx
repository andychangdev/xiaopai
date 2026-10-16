'use client'

import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { publishWeek } from '@/app/actions'
import type { IsoDate } from '@/lib/roster/dates'
import { NOTHING_TO_PUBLISH, nothingToPublish, publishQuestion, type PublishState } from '@/lib/roster/publish'
import type { Minutes } from '@/lib/roster/time'
import { UNREACHABLE } from './ShiftPopover'
import { useAsk } from './useAsk'

/**
 * Publish roster for a draft, Publish update once it's been edited since, and
 * Publish update greyed out in between, so the button doesn't come and go.
 * Publishing asks first, naming what's going out and any warnings, which
 * never stop it, then draws a tick and opens Share roster to copy.
 */
export function PublishButton({
  week,
  state,
  shifts,
  minutes,
  warnings,
}: {
  week: IsoDate
  state: PublishState
  /** How many shifts the week has, and their hours */
  shifts: number
  minutes: Minutes
  /** How many warnings are outstanding */
  warnings: number
}) {
  const [dialog, ask] = useAsk()
  const router = useRouter()
  // With the dialog up, a second click can't happen, but a slow publish, or
  // the moment before Share roster opens, could be clicked again
  const publishing = useRef(false)
  const notify = (title: string, body: string) => ask({ title, body, ok: 'OK', cancel: null })
  const [published, setPublished] = useState(false)

  // Ahead of the greyed-out button, which the week becomes as it's published
  if (published) {
    return (
      <button disabled className="btn btn-primary inline-flex items-center justify-center gap-1.5">
        <svg aria-hidden width="13" height="13" viewBox="0 0 13 13">
          <motion.path
            d="M2 7l3 3 6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onAnimationComplete={() => router.push(`/share/${week}`)}
          />
        </svg>
        Published
      </button>
    )
  }

  // Published and untouched: there's nothing to send until the week changes
  if (state.status === 'published' && !state.changed) {
    return (
      <button
        className="btn disabled:cursor-default disabled:opacity-50 disabled:hover:border-line"
        disabled
        title={`Nothing to publish: the week is as v${state.version} went out`}
      >
        Publish update
      </button>
    )
  }

  async function publish() {
    if (publishing.current) return
    if (nothingToPublish(state, shifts)) {
      await notify('Nothing to publish', NOTHING_TO_PUBLISH)
      return
    }
    if (!(await ask(publishQuestion({ weekStart: week, state, shifts, minutes, warnings })))) return

    publishing.current = true
    const result = await publishWeek(week).catch(() => ({ error: UNREACHABLE }))
    if (result.error) {
      publishing.current = false
      await notify("Couldn't publish", result.error)
    } else {
      setPublished(true) // and publishing stays set: once the tick's drawn, this page is on its way out
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
