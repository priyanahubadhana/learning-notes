import { Group, Ungroup } from 'lucide-react'
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
  const rects = picked.flatMap((b) => layout.get(b.id) ?? [])
  if (picked.length < 2 || rects.length === 0) return null
  const x = Math.min(...rects.map((r) => r.x))
  const y = Math.min(...rects.map((r) => r.y))
  const bottom = Math.max(...rects.map((r) => r.y + r.h))
  const groups = new Set(picked.map((b) => b.group))
  const oneGroup = groups.size === 1 && !groups.has(undefined)
  const canUngroup = picked.some((b) => b.group)
  const ids = picked.map((b) => b.id)
  // Above the boxes' tabs; under the boxes when the page's top is too near.
  const top = y * k >= ABOVE_PX + 4 ? y * k - ABOVE_PX : bottom * k + BELOW_PX
  const btn =
    'inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-accent disabled:text-muted'
  return (
    <div
      data-group-pill
      data-ui
      role="toolbar"
      aria-label={t('paper.group.bar')}
      className="absolute z-30 flex items-center gap-1 rounded-2xl border border-line bg-surface p-1 shadow-md"
      style={{ left: x * k, top }}
    >
      <span
        data-group-count
        className="mr-1 ml-1.5 rounded-full bg-hover px-3 py-1 text-xs font-semibold text-muted tabular-nums"
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
