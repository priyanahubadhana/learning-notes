import { useLayoutEffect, useState } from 'react'

export interface FrameSize {
  width: number
  height: number
}

/** Re-reads after a turn: iPad Safari reports the old size for a moment (F8). */
const REREAD_MS = [120, 400, 900]

const read = (): FrameSize => ({
  width: window.innerWidth,
  height: window.innerHeight,
})

/**
 * The size of the window, kept up to date with a ResizeObserver plus the
 * resize / turn events. Every change is read again a few times in the next
 * second, because iPad Safari can report the OLD size right after a turn while
 * the new one is already laid out (the frame then kept its landscape widths in
 * portrait, 14 Nov F8). Starts from the window so the first paint is right.
 */
export function useFrameSize(): FrameSize {
  const [size, setSize] = useState(read)
  useLayoutEffect(() => {
    const apply = () => {
      const next = read()
      setSize((s) =>
        s.width === next.width && s.height === next.height ? s : next,
      )
    }
    let timers: ReturnType<typeof setTimeout>[] = []
    let frame = 0
    const settle = () => {
      apply()
      cancelAnimationFrame(frame)
      timers.forEach(clearTimeout)
      frame = requestAnimationFrame(apply)
      timers = REREAD_MS.map((ms) => setTimeout(apply, ms))
    }
    const ro = new ResizeObserver(settle)
    ro.observe(document.documentElement)
    window.addEventListener('resize', settle)
    window.addEventListener('orientationchange', settle)
    window.visualViewport?.addEventListener('resize', settle)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', settle)
      window.removeEventListener('orientationchange', settle)
      window.visualViewport?.removeEventListener('resize', settle)
      cancelAnimationFrame(frame)
      timers.forEach(clearTimeout)
    }
  }, [])
  return size
}
