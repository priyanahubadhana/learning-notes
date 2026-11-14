import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { foldRow, type FoldItem, type FoldResult } from './rowFold'

export interface FoldSpec {
  id: string
  /** Fixed width in px; leave out to measure the item in the hidden measurer. */
  fixedW?: number
  /** Higher stays longer; Infinity is never folded. */
  priority: number
  /** Keeps its name even when the others lose theirs (the chip whose card is open). */
  keepName?: boolean
}

interface Measured {
  avail: number
  widths: Record<string, { full: number; short: number }>
}

/**
 * Measures a row and says what fits (TB-08). The row element is the space the
 * items live in; the measurer is a hidden box holding every measured item
 * twice (`data-m-id`, `data-m-mode` = full | short). No window listeners:
 * ResizeObserver watches the row and the measurer.
 */
export function useFold(
  specs: readonly FoldSpec[],
  opts: { gap: number; moreW: number },
): {
  rowRef: RefObject<HTMLDivElement | null>
  measureRef: RefObject<HTMLDivElement | null>
  result: FoldResult
} {
  const rowRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [m, setM] = useState<Measured | null>(null)
  const key = specs.map((s) => `${s.id}:${s.fixedW ?? ''}`).join('|')

  useLayoutEffect(() => {
    const row = rowRef.current
    const box = measureRef.current
    if (!row || typeof ResizeObserver === 'undefined') return
    const run = () => {
      const widths: Measured['widths'] = {}
      box?.querySelectorAll<HTMLElement>('[data-m-id]').forEach((el) => {
        const id = el.dataset.mId!
        const w = el.getBoundingClientRect().width
        const e = (widths[id] ??= { full: 0, short: 0 })
        if (el.dataset.mMode === 'full') e.full = w
        else e.short = w
      })
      const next = { avail: row.clientWidth, widths }
      setM((prev) =>
        prev &&
        prev.avail === next.avail &&
        JSON.stringify(prev.widths) === JSON.stringify(next.widths)
          ? prev
          : next,
      )
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(row)
    if (box) ro.observe(box)
    return () => ro.disconnect()
  }, [key])

  const result: FoldResult = (() => {
    if (!m || m.avail <= 0)
      return { names: true, shown: specs.map((s) => s.id), folded: [] }
    const items: FoldItem[] = specs.map((s) => {
      const w = m.widths[s.id]
      return {
        id: s.id,
        full: s.fixedW ?? w?.full ?? 44,
        short: s.fixedW ?? (s.keepName ? w?.full : w?.short) ?? 44,
        priority: s.priority,
      }
    })
    return foldRow(items, m.avail, opts)
  })()
  return { rowRef, measureRef, result }
}
