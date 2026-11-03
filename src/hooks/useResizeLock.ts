'use client'

import { useEffect } from 'react'

/**
 * Adds `is-resizing` class to <body> while the window is actively being dragged/resized.
 * This suppresses CSS transitions so they don't jank during continuous resize events.
 * Transitions resume ~150ms after the last resize event (debounced).
 *
 * Usage: Call once in a client component high in the tree (e.g. TopHeader or a dashboard shell).
 */
export function useResizeLock() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const onResize = () => {
      document.body.classList.add('is-resizing')
      clearTimeout(timer)
      timer = setTimeout(() => {
        document.body.classList.remove('is-resizing')
      }, 150)
    }
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(timer)
    }
  }, [])
}

export function ResizeLock() {
  useResizeLock()
  return null
}


