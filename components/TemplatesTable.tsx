'use client'

import { useEffect, useRef, useState } from 'react'
import { addTemplate, removeTemplate, updateTemplate, type ActionResult } from '@/app/actions'
import type { Template } from '@/lib/db/queries'
import { formatHours } from '@/lib/roster/time'
import { tableScroll, td, th } from './Page'
import { SaveOnBlur } from './SaveOnBlur'
import { UNREACHABLE } from './ShiftPopover'
import { TimeSelect } from './TimeSelect'
import { useAsk, type AskOptions } from './useAsk'

/** Returns the refusal, if there was one, so a box can put its old value back. */
type Save = (run: () => Promise<ActionResult>) => Promise<string | undefined>

export function TemplatesTable({ templates }: { templates: Template[] }) {
  const [dialog, ask] = useAsk()
  const [error, setError] = useState<string>()
  // The one just added, whose name box takes focus once it arrives
  const [fresh, setFresh] = useState<number>()
  // A second click before the first add returns would add two
  const adding = useRef(false)

  // Every save reports back; the last refusal shows under the table
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
  }

  return (
    <>
      <div className={tableScroll}>
        <table className="w-full min-w-160 border-collapse">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Starts</th>
              <th className={th}>Ends</th>
              <th className={th}>Hours</th>
              <th className={th}>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <TemplateRow key={t.id} template={t} fresh={t.id === fresh} save={save} ask={ask} />
            ))}
            <tr className="bg-surface-3">
              <td className={td} colSpan={5}>
                <button className="btn" onClick={add}>
                  + Add template
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {error && (
        <p role="alert" className="border-t border-line px-3.5 py-2.5 text-[12.5px] text-crit-deep">
          {error}
        </p>
      )}
      {dialog}
    </>
  )
}

function TemplateRow({
  template,
  fresh,
  save,
  ask,
}: {
  template: Template
  fresh: boolean
  save: Save
  ask: (options: AskOptions) => Promise<boolean>
}) {
  const { id, name, start, end } = template
  const row = useRef<HTMLTableRowElement>(null)

  async function remove() {
    const yes = await ask({
      title: `Remove ${name}?`,
      body: "It won't be offered when you add a shift any more. Shifts already placed from it keep their times.",
      ok: 'Remove',
      danger: true,
    })
    if (yes) await save(() => removeTemplate(id))
  }

  // Just added: straight into the name, selected, so typing replaces it
  useEffect(() => {
    if (!fresh) return
    const box = row.current?.querySelector('input')
    box?.focus()
    box?.select()
  }, [fresh])

  return (
    <tr ref={row}>
      <td className={td}>
        <SaveOnBlur
          className="field"
          aria-label="Template name"
          value={name}
          onSave={(name) => save(() => updateTemplate(id, { name }))}
        />
      </td>
      <td className={td}>
        <TimeSelect label={`${name} starts`} value={start} onSave={(start) => save(() => updateTemplate(id, { start }))} />
      </td>
      <td className={td}>
        <TimeSelect label={`${name} ends`} value={end} onSave={(end) => save(() => updateTemplate(id, { end }))} />
      </td>
      <td className={`${td} font-mono tabular-nums`}>{formatHours(end - start)}</td>
      <td className={`${td} text-right`}>
        <button className="text-link text-crit-deep" aria-label={`Remove ${name}`} onClick={remove}>
          Remove
        </button>
      </td>
    </tr>
  )
}
