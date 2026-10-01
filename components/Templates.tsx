'use client'

import { useEffect, useRef, useState } from 'react'
import { addTemplate, removeTemplate, updateTemplate, type ActionResult } from '@/app/actions'
import type { Template } from '@/lib/db/queries'
import { placeOnScale, templateScale, type TemplateScale, type TradingDay } from '@/lib/roster/settings'
import { formatHours, formatRange, formatTime } from '@/lib/roster/time'
import { sectionRefusal } from './Page'
import { SaveOnBlur } from './SaveOnBlur'
import { UNREACHABLE } from './ShiftPopover'
import { TimeSelect } from './TimeSelect'
import { useAsk, type AskOptions } from './useAsk'

/** Returns the refusal, if there was one, so a box can put its old value back. */
type Save = (run: () => Promise<ActionResult>) => Promise<string | undefined>

// Name and times, the bar, then its hours: the ticks above line up with the bars
const columns = 'grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_3rem] items-center gap-x-3'

/**
 * Each shift template as a bar along the business's day, scaled from the
 * week's earliest opening to its latest close, with the times only some days
 * are open hatched. Clicking one opens it for editing in place; only one is
 * open at a time.
 */
export function Templates({ templates, week }: { templates: Template[]; week: TradingDay[] }) {
  const [dialog, ask] = useAsk()
  const [error, setError] = useState<string>()
  const [editing, setEditing] = useState<number | null>(null)
  // The one just added, whose name box takes focus, selected, once it arrives
  const [fresh, setFresh] = useState<number>()
  // A second click before the first add returns would add two
  const adding = useRef(false)
  const scale = templateScale(week, templates)

  // Every save reports back; the last refusal shows under the list
  const save: Save = async (run) => {
    const { error } = await run().catch(() => ({ error: UNREACHABLE }))
    setError(error)
    return error
  }

  async function add() {
    if (adding.current) return
    adding.current = true
    const result = await addTemplate().catch(() => ({ error: UNREACHABLE, id: undefined }))
    adding.current = false
    setError(result.error)
    setFresh(result.id)
    if (result.id !== undefined) setEditing(result.id)
  }

  return (
    // Its own container, so a narrow one keeps only the end ticks
    <div className="@container">
      {templates.length > 0 && (
        <div aria-hidden className={`${columns} pb-1`}>
          <span />
          <span className="relative h-4 font-mono text-[10.5px] text-ink-3">
            {scale.ticks.map((t, i) => (
              <span
                key={t}
                className={`absolute top-0 ${i === 0 ? '' : i === scale.ticks.length - 1 ? '-translate-x-full' : 'hidden -translate-x-1/2 @lg:inline'}`}
                style={{ left: `${placeOnScale(scale, t, t).left}%` }}
              >
                {formatTime(t)}
              </span>
            ))}
          </span>
          <span />
        </div>
      )}
      <ul>
        {templates.map((t) => (
          <TemplateLine
            key={t.id}
            template={t}
            scale={scale}
            open={editing === t.id}
            fresh={t.id === fresh}
            onToggle={() => setEditing(editing === t.id ? null : t.id)}
            onClose={() => setEditing(null)}
            save={save}
            ask={ask}
          />
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-2.5">
        <span className="grid gap-1 text-[11.5px] text-ink-3">
          {scale.spans.map((s) => (
            <span key={s.from} className="flex items-center gap-2">
              <span aria-hidden className="cell-closed h-2.5 w-4.5 rounded-xs border border-line bg-surface-3" />
              {s.note}
            </span>
          ))}
        </span>
        <button className="btn" onClick={add}>
          + Add template
        </button>
      </div>
      {error && (
        <p role="alert" className={sectionRefusal}>
          {error}
        </p>
      )}
      {dialog}
    </div>
  )
}

function TemplateLine({
  template,
  scale,
  open,
  fresh,
  onToggle,
  onClose,
  save,
  ask,
}: {
  template: Template
  scale: TemplateScale
  open: boolean
  fresh: boolean
  onToggle: () => void
  onClose: () => void
  save: Save
  ask: (options: AskOptions) => Promise<boolean>
}) {
  const { id, name, start, end } = template
  const line = useRef<HTMLButtonElement>(null)
  const nameBox = useRef<HTMLDivElement>(null)
  const bar = placeOnScale(scale, start, end)

  async function remove() {
    const yes = await ask({
      title: `Remove ${name}?`,
      body: "It won't be offered when you add a shift any more. Shifts already placed from it keep their times.",
      ok: 'Remove',
      danger: true,
    })
    if (yes) await save(() => removeTemplate(id))
  }

  // Opened: straight into the name. Just added: selected too, so typing replaces it.
  useEffect(() => {
    if (!open) return
    const box = nameBox.current?.querySelector('input')
    box?.focus()
    if (fresh) box?.select()
  }, [open, fresh])

  function close() {
    onClose()
    line.current?.focus()
  }

  return (
    <li className="border-t border-line first:border-t-0">
      <button
        ref={line}
        aria-expanded={open}
        aria-controls={`template-${id}`}
        title={open ? 'Close' : `Change or remove ${name}`}
        className={`${columns} w-full rounded-chip py-2 text-left hover:bg-surface-3`}
        onClick={onToggle}
      >
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold">{name}</span>
          <span className="block font-mono text-[11px] text-ink-3 tabular-nums">{formatRange(start, end)}</span>
        </span>
        <span aria-hidden className="relative h-6 overflow-hidden rounded-chip border border-line bg-surface-3">
          {scale.spans.map((s) => {
            const { left, width } = placeOnScale(scale, s.from, s.to)
            return <span key={s.from} className="cell-closed absolute inset-y-0" style={{ left: `${left}%`, width: `${width}%` }} />
          })}
          <span
            className="highlight absolute inset-y-0.75 rounded-[3px]"
            style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
          />
        </span>
        <span className="text-right font-mono text-[12px] text-ink-2 tabular-nums">{formatHours(end - start)}</span>
      </button>
      {open && (
        <div
          id={`template-${id}`}
          className="mb-2.5 flex flex-wrap items-end gap-2.5 rounded-control border border-line bg-surface-3 p-2.5"
          onKeyDown={(e) => {
            // In the name box Esc has already put back what was saved
            if (e.key === 'Escape') close()
          }}
        >
          <div ref={nameBox} className="grid min-w-36 flex-1 gap-1 text-[11.5px] font-semibold text-ink-2">
            Name
            <SaveOnBlur
              className="field"
              aria-label="Template name"
              value={name}
              onSave={(name) => save(() => updateTemplate(id, { name }))}
            />
          </div>
          <div className="grid gap-1 text-[11.5px] font-semibold text-ink-2">
            Starts
            <TimeSelect label={`${name} starts`} value={start} onSave={(start) => save(() => updateTemplate(id, { start }))} />
          </div>
          <div className="grid gap-1 text-[11.5px] font-semibold text-ink-2">
            Ends
            <TimeSelect label={`${name} ends`} value={end} onSave={(end) => save(() => updateTemplate(id, { end }))} />
          </div>
          <button className="btn" onClick={close}>
            Done
          </button>
          <button className="text-link ml-auto self-center text-crit-deep" aria-label={`Remove ${name}`} onClick={remove}>
            Remove
          </button>
        </div>
      )}
    </li>
  )
}
