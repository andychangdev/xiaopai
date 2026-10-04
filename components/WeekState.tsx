import { historyBadge } from '@/lib/roster/history'
import { needsPublishing, type PublishState } from '@/lib/roster/publish'

/**
 * Where a week stands, for History and the roster's week menu: the highlight
 * once it's out as it stands, amber while it still needs publishing, and
 * "edited since" beside a week changed since it went out, or Edited in place
 * of the badge where there's no room for the note. Null is a week with nothing
 * on it.
 */
export function WeekState({ state, editedNote = true }: { state: PublishState | null; editedNote?: boolean }) {
  if (!state) return <span className="badge border-line text-ink-3">Empty</span>
  const live = !needsPublishing(state)
  const edited = state.status === 'published' && state.changed
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <span className={`badge ${live ? 'highlight' : 'badge-warn'}`}>
        {edited && !editedNote ? 'Edited' : historyBadge(state)}
      </span>
      {editedNote && edited && (
        <span className="text-[12px] whitespace-nowrap text-warn-deep">edited since</span>
      )}
    </span>
  )
}
