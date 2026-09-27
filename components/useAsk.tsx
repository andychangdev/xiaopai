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

/** A question with a second way to go ahead, offered between Cancel and OK. */
export type ChooseOptions = AskOptions & { other: string }

/** Which button answered: OK, the other one, or Cancel (Esc and the backdrop too). */
export type Choice = 'ok' | 'other' | 'cancel'

type Question = AskOptions & { other?: string }

/**
 * A dialog you can await, like the mockup's ask():
 *
 *   const [dialog, ask, choose] = useAsk()
 *   if (await ask({ title: 'Clear week?', body: '…', ok: 'Clear 12 shifts', danger: true })) …
 *   const choice = await choose({ title: 'Book leave?', body: '…', ok: 'Remove them', other: 'Keep them' })
 *
 * Render `dialog` anywhere in the component. Esc, Cancel and the backdrop all answer no.
 */
export function useAsk() {
  const [open, setOpen] = useState<Question | null>(null)
  const answer = useRef<(choice: Choice) => void>(undefined)

  const show = useCallback(
    (options: Question) =>
      new Promise<Choice>((resolve) => {
        answer.current?.('cancel') // a new question answers any open one with no
        answer.current = resolve
        setOpen(options)
      }),
    [],
  )

  const ask = useCallback((options: AskOptions) => show(options).then((choice) => choice === 'ok'), [show])
  const choose: (options: ChooseOptions) => Promise<Choice> = show

  const dialog = open ? (
    <AskDialog
      {...open}
      onAnswer={(choice) => {
        answer.current?.(choice)
        answer.current = undefined
        setOpen(null)
      }}
    />
  ) : null

  return [dialog, ask, choose] as const
}

function AskDialog({
  title,
  body,
  ok = 'Confirm',
  other,
  cancel = 'Cancel',
  danger = false,
  onAnswer,
}: Question & { onAnswer: (choice: Choice) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const okRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    ref.current?.showModal()
    // The answer you'd usually give, so Enter confirms (autoFocus fires too early)
    okRef.current?.focus()
  }, [])

  // close() hands focus back to whatever opened the dialog
  const done = (choice: Choice) => {
    ref.current?.close()
    onAnswer(choice)
  }

  return (
    <dialog
      ref={ref}
      className="m-auto w-[calc(100%-32px)] max-w-[390px] rounded-[12px] border border-line-strong bg-surface text-ink shadow-dialog backdrop:bg-scrim"
      onCancel={(e) => {
        e.preventDefault()
        done('cancel')
      }}
      onClick={(e) => e.target === e.currentTarget && done('cancel')}
    >
      <div className="p-[18px]">
        <h3 className="mb-1.5 text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
        <p className="mb-[15px] text-[13px] leading-[1.55] text-ink-2">{body}</p>
        <div className="flex flex-wrap justify-end gap-2">
          {cancel && (
            <button className="btn" onClick={() => done('cancel')}>
              {cancel}
            </button>
          )}
          {other && (
            <button className="btn" onClick={() => done('other')}>
              {other}
            </button>
          )}
          <button ref={okRef} className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => done('ok')}>
            {ok}
          </button>
        </div>
      </div>
    </dialog>
  )
}
