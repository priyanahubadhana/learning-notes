import { fitsWithoutGap, moveItem } from '../../design/parts/drag/reorder'

/** Home v2 board: which widgets exist, their sizes, and the layout rules. */
export const WIDGET_IDS = [
  'cards',
  'briefing',
  'top3',
  'timer',
  'pending',
  'record',
] as const
export type WidgetId = (typeof WIDGET_IDS)[number]

export const SIZES = ['s', 'm', 'l'] as const
export type Size = (typeof SIZES)[number]

/** Columns of the board (the shared grid drops to fewer on a phone). */
export const BOARD_COLS = 4
/** S = 1 column, M = 2, L = a full row. */
export const SPAN: Record<Size, number> = { s: 1, m: 2, l: 4 }

export interface Slot {
  id: WidgetId
  size: Size
}
export type Layout = Slot[]

export const DEFAULT_LAYOUT: Layout = [
  { id: 'cards', size: 's' },
  { id: 'record', size: 's' },
  { id: 'briefing', size: 'm' },
  { id: 'top3', size: 'm' },
  { id: 'pending', size: 'm' },
  { id: 'timer', size: 'm' },
]

const isId = (v: unknown): v is WidgetId => WIDGET_IDS.includes(v as WidgetId)
const isSize = (v: unknown): v is Size => SIZES.includes(v as Size)

/** True for any array (the real check happens in `normalizeLayout`). */
export const isLayoutish = (v: unknown): v is unknown[] => Array.isArray(v)

/**
 * Turns anything stored into a safe layout: unknown or repeated widgets are
 * dropped, bad sizes become the default size, and a widget that is missing
 * comes back at its default place. A widget can therefore never vanish.
 */
export function normalizeLayout(raw: unknown): Layout {
  const seen = new Set<WidgetId>()
  const out: Layout = []
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const o = (item ?? {}) as { id?: unknown; size?: unknown }
      if (!isId(o.id) || seen.has(o.id)) continue
      seen.add(o.id)
      const def = DEFAULT_LAYOUT.find((d) => d.id === o.id)!
      out.push({ id: o.id, size: isSize(o.size) ? o.size : def.size })
    }
  }
  for (const d of DEFAULT_LAYOUT) if (!seen.has(d.id)) out.push({ ...d })
  return out
}

/** Columns a widget takes on a board of `cols` columns (never more than the board has). */
export const spanOf = (size: Size, cols: number = BOARD_COLS): number =>
  Math.min(SPAN[size], Math.max(1, cols))

/** Same layout with one widget's size changed (order and widget kept). */
export function setSize(layout: Layout, id: WidgetId, size: Size): Layout {
  return layout.map((s) => (s.id === id ? { ...s, size } : s))
}

/**
 * Can the widget sit at `slot` when the order is `order` (ids)? Only if it
 * leaves no hole in its row: a wide widget never starts in the middle of a
 * row that cannot hold it. Used by the shared drag as its `fit` rule.
 */
export function fitsSlot(
  layout: Layout,
  order: readonly string[],
  slot: number,
  cols: number = BOARD_COLS,
): boolean {
  const byId = new Map(layout.map((s) => [s.id as string, s.size]))
  const spans = order.map((id) => spanOf(byId.get(id) ?? 's', cols))
  return fitsWithoutGap(spans, slot, cols)
}

/** Layout after moving `id` to `toIndex` of the final order. */
export function moveWidget(
  layout: Layout,
  id: WidgetId,
  toIndex: number,
): Layout {
  const from = layout.findIndex((s) => s.id === id)
  return from < 0 ? layout : moveItem(layout, from, toIndex)
}

/**
 * After a size change a widget may no longer sit without a hole. Returns the
 * layout with the widget moved to the nearest slot that fits (or unchanged
 * when it fits already). The widget is always kept.
 */
export function settleWidget(
  layout: Layout,
  id: WidgetId,
  cols: number = BOARD_COLS,
): Layout {
  const from = layout.findIndex((s) => s.id === id)
  if (from < 0) return layout
  const ok = (order: Layout, slot: number) =>
    fitsSlot(
      order,
      order.map((s) => s.id),
      slot,
      cols,
    )
  if (ok(layout, from)) return layout
  for (let d = 1; d < layout.length; d++) {
    for (const to of [from - d, from + d]) {
      if (to < 0 || to >= layout.length) continue
      const next = moveItem(layout, from, to)
      if (ok(next, to)) return next
    }
  }
  return layout
}

/**
 * How many columns the shared grid really has for a list `width` px wide.
 * Same maths as the grid's css (auto-fill, each cell at least `minCell` px and
 * a quarter of the row): measured from the width, never from the rendered
 * tracks (a wide widget on a narrow screen would make extra empty tracks).
 */
export function columnsFor(
  width: number,
  gap: number,
  minCell: number,
  most: number = BOARD_COLS,
): number {
  if (!(width > 0)) return most
  const cell = Math.max(minCell, width / most - gap)
  const n = Math.floor((width + gap) / (cell + gap))
  return Math.max(1, Math.min(most, n))
}
