import { useEffect, useState } from 'react'
import type { Ruler } from './readingPrefs'
import { onFrameInput } from './frameInput'

/** The page colours the band uses: Reading mode's by default. */
export interface RulerColours {
  bg: string
  soft: string
  mark: string
}
const READING: RulerColours = {
  bg: 'var(--rd-bg)',
  soft: 'var(--rd-soft)',
  mark: 'var(--rd-mark)',
}

/**
 * Line focus and the reading ruler. "Line focus" dims everything except a
 * band of about two lines; "ruler" only marks one line. The band follows the
 * mouse, or the last place tapped (finger and Pencil), and Alt+↑ / Alt+↓
 * move it by a line. It never takes a tap: the page underneath keeps working.
 */
export function ReadingRuler({
  mode,
  lineHeight,
  colours = READING,
  within,
}: {
  mode: Exclude<Ruler, 'off'>
  /** One line in pixels (text size × line spacing). */
  lineHeight: number
  colours?: RulerColours
  /** Keep the band inside this element (the page), not the whole window. */
  within?: { readonly current: HTMLElement | null }
}) {
  const [y, setY] = useState(() => Math.round(window.innerHeight * 0.4))

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setY(e.clientY)
    }
    const tap = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') setY(e.clientY)
    }
    const step = (k: string) =>
      setY((v) =>
        Math.min(
          window.innerHeight - 8,
          Math.max(8, v + (k === 'ArrowDown' ? 1 : -1) * lineHeight),
        ),
      )
    const key = (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
      e.preventDefault()
      step(e.key)
    }
    // Taps and Alt+↑/↓ inside an EPUB's frame.
    const offFrame = onFrameInput((d) => {
      if (d.key) step(d.key)
      else if (d.y !== undefined) setY(d.y)
    })
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', tap)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', tap)
      document.removeEventListener('keydown', key)
      offFrame()
    }
  }, [lineHeight])

  let band = mode === 'focus' ? lineHeight * 2.4 : lineHeight * 1.3
  // Clipped to the page (gate 3 fixes 2 and 3): the app shell stays normal.
  const box = within?.current?.getBoundingClientRect()
  const area = box
    ? { left: box.left, top: box.top, width: box.width, height: box.height }
    : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
  let top = Math.max(0, y - area.top - band / 2)
  // Gate 3, tenth visit, fix 6: on a PDF the band starts on the nearest whole
  // line, so no word is cut in half.
  let line: DOMRect | null = null
  for (const s of within?.current?.querySelectorAll('.textLayer span') ?? []) {
    const r = s.getBoundingClientRect()
    const d = Math.abs(r.top + r.height / 2 - y)
    if (
      r.height &&
      d <= Math.max(lineHeight, r.height) * 1.5 &&
      (!line || d < Math.abs(line.top + line.height / 2 - y))
    )
      line = r
  }
  if (line) {
    const pad = lineHeight * 0.2
    top = Math.max(0, line.top - area.top - pad)
    band = Math.max(band, line.height + 2 * pad)
  }

  if (mode === 'focus') {
    return (
      <div
        aria-hidden
        data-testid="reading-ruler"
        data-mode="focus"
        className="pointer-events-none fixed z-[75] overflow-hidden"
        style={area}
      >
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: top, background: colours.bg, opacity: 0.82 }}
        />
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            top: top + band,
            background: colours.bg,
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
      className="pointer-events-none fixed z-[75] border-y-2"
      style={{
        left: area.left,
        width: area.width,
        top: area.top + Math.min(top, Math.max(0, area.height - band)),
        height: band,
        borderColor: colours.soft,
        background: colours.mark,
        opacity: 0.35,
      }}
    />
  )
}
