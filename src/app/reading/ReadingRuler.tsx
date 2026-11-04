import { useEffect, useState } from 'react'
import type { Ruler } from './readingPrefs'

/**
 * Line focus and the reading ruler. "Line focus" dims everything except a
 * band of about two lines; "ruler" only marks one line. The band follows the
 * mouse, or the last place tapped (finger and Pencil), and Alt+↑ / Alt+↓
 * move it by a line. It never takes a tap: the page underneath keeps working.
 */
export function ReadingRuler({
  mode,
  lineHeight,
}: {
  mode: Exclude<Ruler, 'off'>
  /** One line in pixels (text size × line spacing). */
  lineHeight: number
}) {
  const [y, setY] = useState(() => Math.round(window.innerHeight * 0.4))

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setY(e.clientY)
    }
    const tap = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') setY(e.clientY)
    }
    const key = (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
      e.preventDefault()
      setY((v) =>
        Math.min(
          window.innerHeight - 8,
          Math.max(8, v + (e.key === 'ArrowDown' ? 1 : -1) * lineHeight),
        ),
      )
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', tap)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', tap)
      document.removeEventListener('keydown', key)
    }
  }, [lineHeight])

  const band = mode === 'focus' ? lineHeight * 2.4 : lineHeight * 1.3
  const top = Math.max(0, y - band / 2)

  if (mode === 'focus') {
    return (
      <div
        aria-hidden
        data-testid="reading-ruler"
        data-mode="focus"
        className="pointer-events-none fixed inset-0 z-[75]"
      >
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: top, background: 'var(--rd-bg)', opacity: 0.82 }}
        />
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            top: top + band,
            background: 'var(--rd-bg)',
            opacity: 0.82,
          }}
        />
      </div>
    )
  }
  return (
    <div
      aria-hidden
      data-testid="reading-ruler"
      data-mode="ruler"
      className="pointer-events-none fixed inset-x-0 z-[75] border-y-2"
      style={{
        top,
        height: band,
        borderColor: 'var(--rd-soft)',
        background: 'var(--rd-mark)',
        opacity: 0.35,
      }}
    />
  )
}
