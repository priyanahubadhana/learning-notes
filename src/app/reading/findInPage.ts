export const FIND_SCOPES = ['page', 'notebook', 'everywhere'] as const
export type FindScope = (typeof FIND_SCOPES)[number]

/** Where `query` occurs in `text` (case and accents ignored), as [start, end). */
export function matchOffsets(text: string, query: string): [number, number][] {
  const q = query.trim()
  if (!q) return []
  const fold = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  // Folding can change the length (rare); fall back to plain lower case then.
  const same = fold(text).length === text.length
  const hay = same ? fold(text) : text.toLowerCase()
  const needle = same ? fold(q) : q.toLowerCase()
  const out: [number, number][] = []
  let at = hay.indexOf(needle)
  while (at !== -1) {
    out.push([at, at + needle.length])
    at = hay.indexOf(needle, at + needle.length)
  }
  return out
}

/** Every match of `query` in the text nodes under `root`, as ranges. */
export function findRanges(root: Element, query: string): Range[] {
  const ranges: Range[] = []
  if (!query.trim()) return ranges
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? ''
    for (const [a, b] of matchOffsets(text, query)) {
      const r = document.createRange()
      r.setStart(node, a)
      r.setEnd(node, b)
      ranges.push(r)
    }
  }
  return ranges
}
