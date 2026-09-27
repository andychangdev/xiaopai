'use client'

import { useRef } from 'react'
import { revertToPublished } from '@/app/actions'
import { fullDate, type IsoDate } from '@/lib/roster/dates'
import { publishBadge, type PublishState } from '@/lib/roster/publish'
import { revertQuestion } from '@/lib/roster/revert'
import { UNREACHABLE } from './ShiftPopover'
import { useAsk } from './useAsk'

/**
 * The badge beside the Publish button. Draft and Unpublished changes are in
 * amber, since both still need publishing; Published in the accent.
 * Unpublished changes also holds the way back to the version staff have,
 * which asks first. Undo takes a revert back like any grid action.
 */
export function PublishBadge({ week, state }: { week: IsoDate; state: PublishState }) {
  const [dialog, ask] = useAsk()
  // With the dialog up, a second click can't happen, but one while the revert is on its way could
  const reverting = useRef(false)
  const notify = (title: string, body: string) => ask({ title, body, ok: 'OK', cancel: null })

  const live = state.status === 'published' && !state.changed
  const edited = state.status === 'published' && state.changed ? state : null

  async function revert() {
    if (!edited || reverting.current) return
    if (!(await ask({ ...revertQuestion(edited), danger: true }))) return

    reverting.current = true
    const result: Awaited<ReturnType<typeof revertToPublished>> = await revertToPublished(week).catch(() => ({
      error: UNREACHABLE,
    }))
    reverting.current = false
    if (result.error) await notify("Couldn't revert", result.error)
    else if (result.report) await notify(`Reverted to v${edited.version}`, result.report)
  }

  return (
    <>
      <span
        className={`inline-flex items-center rounded-full border px-[9px] py-1 text-[11px] font-semibold tracking-[0.07em] uppercase ${live ? 'border-accent text-accent' : 'border-warn-line bg-warn-bg text-warn'}`}
      >
        {publishBadge(state)}
        {edited && (
          <>
            <span aria-hidden className="mx-[7px] h-3 w-px bg-warn-line" />
            <button
              aria-label={`Revert to v${edited.version}, as published`}
              title={`Revert to v${edited.version}, as published ${fullDate(edited.publishedAt)}`}
              // Out to the badge's edge, so it's more than the icon to hit
              className="-my-1 -mr-[5px] grid place-items-center self-stretch rounded-full px-[5px] hover:text-ink"
              onClick={revert}
            >
              <UndoIcon />
            </button>
          </>
        )}
      </span>
      {/* Outside the badge, which would make it all capitals */}
      {dialog}
    </>
  )
}

/** An arrow going back on itself. */
function UndoIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5 3 2.5 6l3 3" />
      <path d="M2.5 6H10a3.5 3.5 0 0 1 0 7H7" />
    </svg>
  )
}
