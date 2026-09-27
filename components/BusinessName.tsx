'use client'

import { useState } from 'react'
import { setBusinessName } from '@/app/actions'
import { SaveOnBlur } from './SaveOnBlur'
import { UNREACHABLE } from './ShiftPopover'

/** The business's name, saved when you leave the box. */
export function BusinessName({ name }: { name: string }) {
  const [error, setError] = useState<string>()

  async function save(name: string) {
    const { error } = await setBusinessName(name).catch(() => ({ error: UNREACHABLE }))
    setError(error)
    return error
  }

  return (
    <>
      <div className="p-3.5">
        <SaveOnBlur className="field max-w-[320px]" aria-label="Business name" value={name} onSave={save} />
      </div>
      {error && (
        <p role="alert" className="border-t border-line px-3.5 py-2.5 text-[12.5px] text-crit">
          {error}
        </p>
      )}
    </>
  )
}
