'use client'

import { useRef } from 'react'
import { revertToPublished } from '@/app/actions'
import { fullDate, type IsoDate } from '@/lib/roster/dates'
import { publishStatus, type PublishState } from '@/lib/roster/publish'
import { revertQuestion } from '@/lib/roster/revert'
import { UNREACHABLE } from './ShiftPopover'
import { useAsk } from './useAsk'

/**
 * Where the week stands, in a line over the Publish button. The dot is amber
 * for Draft and Unpublished changes, since both still need publishing, and
 * the accent once it's out as it stands. Unpublished changes also holds
 * Revert, the way back to the version staff have, which asks first. Undo
 * takes a revert back like any grid action.
 */
export function PublishStatus({ week, state }: { week: IsoDate; state: PublishState }) {
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

  const { label, note } = publishStatus(state)
  return (
    <div className="flex min-h-5 items-center gap-1.75 text-[12.5px]">
      <span aria-hidden className={`size-1.75 flex-none rounded-full ${live ? 'bg-accent' : 'bg-warn'}`} />
      <span className="font-semibold">{label}</span>
      {note && <span className="text-ink-2">· {note}</span>}
      {edited && (
        <button
          aria-label={`Revert to v${edited.version}, as published`}
          title={`Revert to v${edited.version}, as published ${fullDate(edited.publishedAt)}`}
          className="ml-auto inline-flex items-center gap-1.25 rounded-chip text-[12px] font-medium text-warn-deep hover:text-ink"
          onClick={revert}
        >
          <UndoIcon />
          Revert
        </button>
      )}
      {dialog}
    </div>
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
