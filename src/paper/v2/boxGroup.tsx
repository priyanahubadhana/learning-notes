import { Group, Ungroup } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { createId } from '../../core/ids'
import { t } from '../../i18n/t'
import type { PaperBox } from '../../core/types'

type Rect = { x: number; y: number; w: number; h: number }

/** Room the pill needs above the picked boxes: their tabs, then the pill (px). */
const ABOVE_PX = 120
const BELOW_PX = 36

/**
 * Text box v2, TB-32: the group pill. Two or more picked boxes show one small
 * pill with how many are picked and Group / Ungroup; the one that does not
 * apply is dimmed, not hidden, so the pill never changes shape. States
 * picture, panel 6a.
 */
export default function GroupPill({
  picked,
  layout,
  k,
  onGroup,
}: {
  picked: PaperBox[]
  layout: Map<string, Rect>
  k: number
  onGroup: (ids: string[], group: string | undefined) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [chosen, setChosen] = useState<{ left: number; top: number } | null>(
    null,
  )
  const rects = picked.flatMap((b) => layout.get(b.id) ?? [])
  const x = rects.length ? Math.min(...rects.map((r) => r.x)) : 0
  const y = rects.length ? Math.min(...rects.map((r) => r.y)) : 0
  const bottom = rects.length ? Math.max(...rects.map((r) => r.y + r.h)) : 0
  const groups = new Set(picked.map((b) => b.group))
  const oneGroup = groups.size === 1 && !groups.has(undefined)
  const canUngroup = picked.some((b) => b.group)
  const ids = picked.map((b) => b.id)
  // Above the boxes' tabs, or under the boxes, as far left as the boxes or
  // shifted right: the first spot that is clear of every other box's words
  // (measured after drawing).
  const tops = [y * k - ABOVE_PX, bottom * k + BELOW_PX].filter((v) => v >= 4)
  const first = { left: x * k, top: tops[0] ?? 4 }
  const at = chosen ?? first
  const key = picked.map((b) => b.id).join() + tops.join() + x
  useLayoutEffect(() => {
    const el = ref.current
    const par = el?.offsetParent?.getBoundingClientRect()
    if (!el || !par) return
    const ids = new Set(picked.map((b) => b.id))
    const words: DOMRect[] = []
    for (const n of document.querySelectorAll<HTMLElement>(
      '[data-paper-box] .bn-inline-content',
    )) {
      const id = n.closest('[data-paper-box]')?.getAttribute('data-paper-box')
      if (ids.has(id ?? '')) continue
      const range = document.createRange()
      range.selectNodeContents(n)
      const r = range.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) words.push(r)
    }
    const clear = (c: { left: number; top: number }) => {
      const l = par.left + c.left
      const t = par.top + c.top
      return !words.some(
        (r) =>
          r.left < l + el.offsetWidth &&
          r.right > l &&
          r.top < t + el.offsetHeight &&
          r.bottom > t,
      )
    }
    const spots = tops
      .flatMap((top) =>
        [0, 20, 40, 60, 80, 100, 140, 180, 240].map((dx) => ({
          left: x * k + dx,
          top,
        })),
      )
      .filter(
        (c) =>
          par.left + c.left + el.offsetWidth <= window.innerWidth - 12 &&
          par.left + c.left >= 8,
      )
    const next = spots.find(clear) ?? first
    setChosen((cur) =>
      cur && cur.left === next.left && cur.top === next.top ? cur : next,
    )
    // Measured when the picked boxes or their places change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  if (picked.length < 2 || rects.length === 0) return null
  const btn =
    'inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-accent disabled:text-muted'
  return (
    <div
      ref={ref}
      data-group-pill
      data-ui
      role="toolbar"
      aria-label={t('paper.group.bar')}
      className="absolute z-(--z-pill) flex w-max items-center gap-1 rounded-2xl border border-line bg-surface p-1 shadow-md"
      style={{ left: at.left, top: at.top }}
    >
      <span
        data-group-count
        className="mr-1 ml-1.5 rounded-full whitespace-nowrap bg-hover px-3 py-1 text-xs font-semibold text-muted tabular-nums"
      >
        {t('paper.group.count', { count: picked.length })}
      </span>
      <button
        type="button"
        data-group-action="group"
        disabled={oneGroup}
        className={btn + (oneGroup ? '' : ' bg-accent/15 text-accent')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onGroup(ids, createId())}
      >
        <Group size={16} aria-hidden />
        {t('paper.group.group')}
      </button>
      <button
        type="button"
        data-group-action="ungroup"
        disabled={!canUngroup}
        className={btn + (canUngroup ? ' bg-accent/15 text-accent' : '')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onGroup(ids, undefined)}
      >
        <Ungroup size={16} aria-hidden />
        {t('paper.group.ungroup')}
      </button>
    </div>
  )
}
