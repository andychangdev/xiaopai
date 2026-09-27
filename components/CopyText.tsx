'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const SHOWN_FOR = 5000

/**
 * The roster text, and a button that copies it for the chat. Where the
 * browser won't allow that (no permission, or a page that isn't secure), the
 * text is selected instead, ready for ⌘C.
 */
export function CopyText({ text, back }: { text: string; /** The week's grid */ back: string }) {
  const pre = useRef<HTMLPreElement>(null)
  // Counted, so the same words again still read out as a new message
  const [message, setMessage] = useState<{ words: string; n: number }>()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  // Each copy shows its message for the full time, even the same message again
  function say(words: string) {
    clearTimeout(timer.current)
    setMessage((last) => ({ words, n: (last?.n ?? 0) + 1 }))
    timer.current = setTimeout(() => setMessage(undefined), SHOWN_FOR)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      say('Copied. Paste it straight into the chat.')
    } catch {
      const range = document.createRange()
      range.selectNodeContents(pre.current!)
      const selection = getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      say('Selected. Press ⌘C to copy it.')
    }
  }

  return (
    <>
      {/* All of it, never scrolled inside a box, so the DRAFT at the foot is always in sight */}
      <pre
        ref={pre}
        className="m-0 px-[18px] py-4 font-mono text-[13px] leading-[1.7] wrap-break-word whitespace-pre-wrap select-text selection:bg-accent selection:text-accent-ink"
      >
        {text}
      </pre>
      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-3 px-3.5 py-3">
        <button className="btn btn-primary" onClick={copy}>
          Copy to clipboard
        </button>
        <Link href={back} className="btn">
          Back to roster
        </Link>
        <span role="status" className="text-[12.5px] font-medium text-accent">
          {message && <span key={message.n}>{message.words}</span>}
        </span>
      </div>
    </>
  )
}
