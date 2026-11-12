import { useLayoutEffect, useState } from 'react'

export interface FrameSize {
  width: number
  height: number
}

/**
 * The size of the window, kept up to date with a ResizeObserver (no raw
 * resize listener). Starts from the window so the first paint is right.
 */
export function useFrameSize(): FrameSize {
  const read = (): FrameSize => ({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  const [size, setSize] = useState(read)
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      const next = read()
      setSize((s) =>
        s.width === next.width && s.height === next.height ? s : next,
      )
    })
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [])
  return size
}
