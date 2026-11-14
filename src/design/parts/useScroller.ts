import { useState } from 'react'

/** The scroller element as state, so its ScrollBar re-renders once it is attached: `const [node, ref] = useScroller()`. */
export function useScroller(): [
  HTMLElement | null,
  (el: HTMLElement | null) => void,
] {
  return useState<HTMLElement | null>(null)
}
