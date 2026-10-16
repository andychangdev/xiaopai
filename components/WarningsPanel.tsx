import { AnimatePresence, motion } from 'motion/react'
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
            <span className="rounded-full border border-crit-line bg-crit-bg px-1.5 font-mono text-[10.5px] tracking-normal text-crit-deep">
              {warnings.length}
            </span>
          )}
        </>
      }
    >
      {warnings.length ? (
        <ul className="py-1">
          {/* A warning opens and closes its own space, so the rest slide to fill it */}
          <AnimatePresence initial={false}>
            {keyed(warnings).map(([key, w]) => (
              <motion.li
                key={key}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-b border-line text-[12.5px] leading-[1.4] last:border-b-0"
              >
                <div className="flex gap-2.25 px-3 py-2.25">
                  <span aria-hidden className={`w-0.75 flex-none rounded-xs ${w.level === 'high' ? 'bg-crit' : 'bg-warn'}`} />
                  <span>
                    <span className="block font-semibold">
                      <span className="sr-only">{severity[w.level]}: </span>
                      {w.who}
                    </span>
                    <span className="text-ink-2">{w.text}</span>
                  </span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="px-3 py-4.5 text-[12.5px] text-ink-3">Nothing to flag on this week.</p>
      )}
    </Panel>
  )
}

/** Each warning with a key that stays with it as others come and go: what it says, and which of any the same it is. */
function keyed(warnings: Warning[]): [string, Warning][] {
  const seen = new Map<string, number>()
  return warnings.map((w) => {
    const says = `${w.who}\n${w.text}`
    const n = seen.get(says) ?? 0
    seen.set(says, n + 1)
    return [`${says}\n${n}`, w]
  })
}
