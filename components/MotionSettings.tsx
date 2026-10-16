'use client'

import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * How everything animates: quick and plain, with Reduce motion in the
 * system's settings honoured. With it on, nothing moves or grows, and things
 * only fade.
 */
export function MotionSettings({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}>
      {children}
    </MotionConfig>
  )
}
