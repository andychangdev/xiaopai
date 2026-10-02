import { historyBadge } from '@/lib/roster/history'
import { needsPublishing, type PublishState } from '@/lib/roster/publish'

/**
 * Where a week stands, for History and the roster's week menu: the highlight
 * once it's out as it stands, amber while it still needs publishing, and
 * "edited since" beside a week changed since it went out, unless the amber is
 * left to say so. Null is a week with nothing on it.
 */
export function WeekState({ state, editedNote = true }: { state: PublishState | null; editedNote?: boolean }) {
  if (!state) return <span className="badge border-line text-ink-3">Empty</span>
  const live = !needsPublishing(state)
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <span className={`badge ${live ? 'highlight' : 'badge-warn'}`}>{historyBadge(state)}</span>
      {editedNote && state.status === 'published' && state.changed && (
        <span className="text-[12px] whitespace-nowrap text-warn-deep">edited since</span>
      )}
    </span>
  )
}
