'use client'

import { useEffect, useRef, type ComponentProps } from 'react'

/**
 * A text box that saves when you leave it or press Enter, and puts the saved
 * value back if the save is refused. Esc abandons the edit.
 */
export function SaveOnBlur({
  value,
  onSave,
  ...props
}: { value: string; onSave: (v: string) => Promise<string | undefined> } & Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue'
>) {
  const ref = useRef<HTMLInputElement>(null)

  // Show the stored value once it comes back (trimmed, say), unless you're
  // still typing in the box
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) ref.current.value = value
  }, [value])

  return (
    <input
      {...props}
      ref={ref}
      defaultValue={value}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          e.currentTarget.value = value
          e.currentTarget.blur()
        }
      }}
      onBlur={async (e) => {
        const box = e.currentTarget
        if (box.value.trim() === value) {
          box.value = value
          return
        }
        const refused = await onSave(box.value)
        // Back in the box and typing again? Leave that alone.
        if (refused && document.activeElement !== box) box.value = value
      }}
    />
  )
}
