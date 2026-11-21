import { visibleOutline, type OutlineItem } from '../panelModel'

/** One line of the notebook outline (all lines are the same height, so the list can be windowed). */
export interface OutlineLine {
  key: string
  kind: 'page' | 'heading' | 'toggle'
  pageId: string
  /** The block to glide to (headings and toggles). */
  blockId?: string
  text: string
  /** Indent: pages by their depth, headings by their level under the page. */
  indent: number
  /** Heading level 1..3 (headings), 0 for a page line. */
  level: number
  number?: string
  /** Page line: open (headings shown) or folded to one line. */
  open?: boolean
  /** The line can be folded (page lines always; heading lines when deeper lines follow). */
  foldable: boolean
  folded: boolean
}

export interface OutlinePage {
  id: string
  title: string
  depth: number
}

export interface OutlineInput {
  pages: readonly OutlinePage[]
  /** Pages shown open (their headings listed). */
  open: ReadonlySet<string>
  /** Headings of the open pages (from `outlineItems`). */
  items: ReadonlyMap<string, readonly OutlineItem[]>
  /** Heading lines folded by the reader (Professional fold arrows). */
  foldedHeadings: ReadonlySet<string>
  /** The Find box; lines that do not match are left out. */
  query: string
  /** Professional: fold arrows on heading lines. */
  headingFold: boolean
}

const norm = (s: string) => s.toLocaleLowerCase()

/**
 * NB-B48: the whole notebook outline. Pages are one line each and fold; the
 * open ones list their headings. With a Find text, only matching lines stay
 * (and the pages that hold them are shown open).
 */
export function buildOutlineLines(i: OutlineInput): OutlineLine[] {
  const q = norm(i.query.trim())
  const out: OutlineLine[] = []
  for (const page of i.pages) {
    const all = i.items.get(page.id) ?? []
    const titleHit = q !== '' && norm(page.title).includes(q)
    const heads = q
      ? all.filter((h) => norm(h.text).includes(q))
      : visibleOutline(all, i.foldedHeadings)
    if (q && !titleHit && heads.length === 0) continue
    const open = q ? heads.length > 0 : i.open.has(page.id)
    out.push({
      key: `p:${page.id}`,
      kind: 'page',
      pageId: page.id,
      text: page.title,
      indent: Math.min(page.depth, 3),
      level: 0,
      open,
      foldable: !q,
      folded: !open,
    })
    if (!open) continue
    for (const h of heads) {
      out.push({
        key: `h:${h.id}`,
        kind: h.kind,
        pageId: page.id,
        blockId: h.id,
        text: h.text,
        indent: Math.min(page.depth, 3),
        level: h.level,
        number: h.number,
        foldable: i.headingFold && !q && h.hasChildren,
        folded: i.foldedHeadings.has(h.id),
      })
    }
  }
  return out
}
