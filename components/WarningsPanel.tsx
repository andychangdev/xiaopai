import type { Warning } from '@/lib/roster/warnings'
import { Panel } from './Panel'

// What the bar's colour says, for a screen reader
const severity = { high: 'Serious', low: 'Caution' }

/** Everything unusual about the week, the serious first. It only advises: nothing here blocks anything. */
export function WarningsPanel({ warnings }: { warnings: Warning[] }) {
  return (
    <Panel
      title={
        <>
          Warnings
          {warnings.length > 0 && (
            <span className="rounded-full border border-crit-line bg-crit-bg px-1.5 font-mono text-[10.5px] tracking-normal text-crit">
              {warnings.length}
            </span>
          )}
        </>
      }
    >
      {warnings.length ? (
        <ul className="py-1">
          {warnings.map((w, i) => (
            <li
              key={i}
              className="flex gap-[9px] border-b border-line px-3 py-[9px] text-[12.5px] leading-[1.4] last:border-b-0"
            >
              <span aria-hidden className={`w-[3px] flex-none rounded-[2px] ${w.level === 'high' ? 'bg-crit' : 'bg-warn'}`} />
              <span>
                <span className="block font-semibold">
                  <span className="sr-only">{severity[w.level]}: </span>
                  {w.who}
                </span>
                <span className="text-ink-2">{w.text}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3 py-[18px] text-[12.5px] text-ink-3">Nothing to flag on this week.</p>
      )}
    </Panel>
  )
}
