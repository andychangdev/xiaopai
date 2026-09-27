'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

export type AskOptions = {
  title: string
  body: ReactNode
  ok?: string
  /** null for a notice with only an OK button */
  cancel?: string | null
  danger?: boolean
}

/**
 * A dialog you can await, like the mockup's ask():
 *
 *   const [dialog, ask] = useAsk()
 *   if (await ask({ title: 'Clear week?', body: '…', ok: 'Clear 12 shifts', danger: true })) …
 *
 * Render `dialog` anywhere in the component. Esc, Cancel and the backdrop all answer no.
 */
export function useAsk() {
  const [open, setOpen] = useState<AskOptions | null>(null)
  const answer = useRef<(yes: boolean) => void>(undefined)

  const ask = useCallback(
    (options: AskOptions) =>
      new Promise<boolean>((resolve) => {
        answer.current?.(false) // a new question answers any open one with no
        answer.current = resolve
        setOpen(options)
      }),
    [],
  )

  const dialog = open ? (
    <AskDialog
      {...open}
      onAnswer={(yes) => {
        answer.current?.(yes)
        answer.current = undefined
        setOpen(null)
      }}
    />
  ) : null

  return [dialog, ask] as const
}

function AskDialog({
  title,
  body,
  ok = 'Confirm',
  cancel = 'Cancel',
  danger = false,
  onAnswer,
}: AskOptions & { onAnswer: (yes: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const okRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    ref.current?.showModal()
    // The answer you'd usually give, so Enter confirms (autoFocus fires too early)
    okRef.current?.focus()
  }, [])

  // close() hands focus back to whatever opened the dialog
  const done = (yes: boolean) => {
    ref.current?.close()
    onAnswer(yes)
  }

  return (
    <dialog
      ref={ref}
      className="m-auto w-[calc(100%-32px)] max-w-[390px] rounded-[12px] border border-line-strong bg-surface text-ink shadow-dialog backdrop:bg-scrim"
      onCancel={(e) => {
        e.preventDefault()
        done(false)
      }}
      onClick={(e) => e.target === e.currentTarget && done(false)}
    >
      <div className="p-[18px]">
        <h3 className="mb-1.5 text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
        <p className="mb-[15px] text-[13px] leading-[1.55] text-ink-2">{body}</p>
        <div className="flex flex-wrap justify-end gap-2">
          {cancel && (
            <button className="btn" onClick={() => done(false)}>
              {cancel}
            </button>
          )}
          <button ref={okRef} className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => done(true)}>
            {ok}
          </button>
        </div>
      </div>
    </dialog>
  )
}
