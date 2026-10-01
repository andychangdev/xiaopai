'use client'

import { useState } from 'react'
import { setBusinessName } from '@/app/actions'
import { sectionRefusal } from './Page'
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
      <SaveOnBlur className="field max-w-[320px]" aria-label="Business name" value={name} onSave={save} />
      {error && (
        <p role="alert" className={sectionRefusal}>
          {error}
        </p>
      )}
    </>
  )
}
