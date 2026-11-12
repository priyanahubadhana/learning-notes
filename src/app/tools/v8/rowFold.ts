/**
 * Row and bar folding (TB-08), pure and tested. When the items do not fit:
 * first they lose their names (icon only), then the least important ones fold
 * into the "⋯ n" button at the end. The row never scrolls sideways.
 */

export interface FoldItem {
  id: string
  /** Width with its name, in px. */
  full: number
  /** Width without its name (icon only), in px. */
  short: number
  /** Higher stays longer; Infinity is never folded. */
  priority: number
}

export interface FoldResult {
  /** True while the items still show their names. */
  names: boolean
  /** Ids that stay in the row, in their original order. */
  shown: string[]
  /** Ids that moved into "⋯ n", in their original order. */
  folded: string[]
}

export interface FoldOptions {
  /** Space between two items. */
  gap: number
  /** Width of the "⋯ n" button (counted only when something folds). */
  moreW: number
}

const sum = (items: FoldItem[], key: 'full' | 'short', gap: number): number =>
  items.reduce((s, i) => s + i[key], 0) + gap * Math.max(0, items.length - 1)

export function foldRow(
  items: readonly FoldItem[],
  avail: number,
  { gap, moreW }: FoldOptions,
): FoldResult {
  const all = items.map((i) => i.id)
  if (sum([...items], 'full', gap) <= avail)
    return { names: true, shown: all, folded: [] }
  if (sum([...items], 'short', gap) <= avail)
    return { names: false, shown: all, folded: [] }
  const keep = [...items]
  const gone = new Set<string>()
  while (keep.length > 0 && sum(keep, 'short', gap) + gap + moreW > avail) {
    // The least important goes first; between equals, the later one.
    let at = -1
    for (let i = 0; i < keep.length; i++)
      if (
        keep[i]!.priority !== Infinity &&
        (at < 0 || keep[i]!.priority <= keep[at]!.priority)
      )
        at = i
    if (at < 0) break
    gone.add(keep[at]!.id)
    keep.splice(at, 1)
  }
  return {
    names: false,
    shown: keep.map((i) => i.id),
    folded: all.filter((id) => gone.has(id)),
  }
}
