import { useSyncExternalStore } from 'react'

/**
 * The list that is being scrolled right now (touched, hovered or scrolled), as
 * found by app/scrollHints.ts. The ScrollBarHost draws the ONE shared scroll
 * bar (ScrollBar.tsx) on it, so every list in the app has the same bar.
 */
let target: HTMLElement | null = null
const subs = new Set<() => void>()

export function setScrollTarget(el: HTMLElement | null): void {
  if (el === target) return
  target = el
  subs.forEach((f) => f())
}

export const getScrollTarget = (): HTMLElement | null => target

export function useScrollTarget(): HTMLElement | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    getScrollTarget,
    () => null,
  )
}
