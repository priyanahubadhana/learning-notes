/**
 * Which bar buttons fit in ONE row (slice 7a). The rest go into the "⋯" card,
 * never onto a second row and never sideways. Pure, so a test can check it.
 */
export interface FitItem {
  id: string
  /** Width the button needs, in px, gap included. */
  w: number
  /** Lower = stays in the bar longer. */
  rank: number
}

/** Ids that stay in the bar when `avail` px are free (best rank first). */
export function fitItems(items: FitItem[], avail: number): Set<string> {
  const keep = new Set<string>()
  let left = avail
  for (const it of [...items].sort((a, b) => a.rank - b.rank)) {
    if (it.w > left) break // never skip ahead: ranks drop in order
    keep.add(it.id)
    left -= it.w
  }
  return keep
}
