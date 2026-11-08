import { byOrder } from '../../core/order'
import type { Block } from '../../core/types'
import { blockText } from '../../search/searchText'

/** A heading of a page, in reading order. */
export interface OutlineHeading {
  id: string
  text: string
  level: number
}

/** Blocks of one page in reading order (parents before their children). */
export function inReadingOrder(blocks: readonly Block[]): Block[] {
  const live = blocks.filter((b) => b.deletedAt === null)
  const children = new Map<string | null, Block[]>()
  for (const b of live) {
    const list = children.get(b.parentId) ?? []
    list.push(b)
    children.set(b.parentId, list)
  }
  const out: Block[] = []
  const seen = new Set<string>()
  const walk = (parentId: string | null) => {
    for (const b of (children.get(parentId) ?? []).sort(byOrder)) {
      if (seen.has(b.id)) continue
      seen.add(b.id)
      out.push(b)
      walk(b.id)
    }
  }
  walk(null)
  return out
}

/** The headings of a page (the same tree as the reader's Contents). */
export function outlineFromBlocks(blocks: readonly Block[]): OutlineHeading[] {
  const out: OutlineHeading[] = []
  for (const b of inReadingOrder(blocks)) {
    if (b.type !== 'heading') continue
    const text = blockText(b.content).trim()
    if (!text) continue
    const level = Number(b.content.level)
    out.push({
      id: b.id,
      text,
      level: level >= 1 && level <= 3 ? level : 1,
    })
  }
  return out
}

/** The first `count` lines of text on a page, for its thumbnail. */
export function previewLines(blocks: readonly Block[], count = 3): string[] {
  const out: string[] = []
  for (const b of inReadingOrder(blocks)) {
    if (b.type === 'heading') continue
    const text = blockText(b.content).replace(/\s+/g, ' ').trim()
    if (text) out.push(text.slice(0, 90))
    if (out.length >= count) break
  }
  return out
}

/** One line of the Outline: a heading, or (when asked) a toggle's summary. */
export interface OutlineItem {
  id: string
  text: string
  /** Indent level, 1 and up (a toggle sits one level under the heading above it). */
  level: number
  kind: 'heading' | 'toggle'
  /** "1", "1.1", "1.2" ... for headings when numbering is on. */
  number?: string
  /** The next line sits deeper (so it can be folded). */
  hasChildren: boolean
}

export interface OutlineView {
  /** Deepest heading level shown: 1, 2 or 3 (all). */
  depth: 1 | 2 | 3
  toggles: boolean
  numbered: boolean
}

export const DEFAULT_OUTLINE_VIEW: OutlineView = {
  depth: 3,
  toggles: false,
  numbered: false,
}

/**
 * The Outline lines for a view: headings up to `depth`, toggle summaries
 * when `toggles` is on, chapter numbers (1, 1.1, 1.2 ...) when `numbered`.
 */
export function outlineItems(
  blocks: readonly Block[],
  view: OutlineView = DEFAULT_OUTLINE_VIEW,
): OutlineItem[] {
  const ordered = inReadingOrder(blocks)
  const byId = new Map(ordered.map((b) => [b.id, b]))
  const toggleDepth = (b: Block) => {
    let n = 0
    for (
      let p = b.parentId ? byId.get(b.parentId) : undefined;
      p;
      p = p.parentId ? byId.get(p.parentId) : undefined
    ) {
      if (p.type === 'toggleListItem') n++
    }
    return n
  }
  const items: OutlineItem[] = []
  let lastHeading = 0
  const counters: number[] = []
  for (const b of ordered) {
    const text = blockText(b.content).trim()
    if (!text) continue
    if (b.type === 'heading') {
      const raw = Number(b.content.level)
      const level = raw >= 1 && raw <= 3 ? raw : 1
      lastHeading = level
      if (level > view.depth) continue
      let number: string | undefined
      if (view.numbered) {
        counters.length = level
        for (let i = 0; i < level; i++)
          counters[i] = counters[i] ?? (i < level - 1 ? 1 : 0)
        counters[level - 1] += 1
        number = counters.slice(0, level).join('.')
      }
      items.push({
        id: b.id,
        text,
        level,
        kind: 'heading',
        number,
        hasChildren: false,
      })
    } else if (view.toggles && b.type === 'toggleListItem') {
      const under = Math.min(lastHeading, view.depth)
      items.push({
        id: b.id,
        text,
        level: under + 1 + toggleDepth(b),
        kind: 'toggle',
        hasChildren: false,
      })
    }
  }
  items.forEach((item, i) => {
    item.hasChildren = (items[i + 1]?.level ?? 0) > item.level
  })
  return items
}

/** The lines left after folding: a folded line hides the deeper lines under it. */
export function visibleOutline(
  items: readonly OutlineItem[],
  folded: ReadonlySet<string>,
): OutlineItem[] {
  const out: OutlineItem[] = []
  let hideBelow = Infinity
  for (const item of items) {
    if (item.level > hideBelow) continue
    hideBelow = Infinity
    out.push(item)
    if (folded.has(item.id)) hideBelow = item.level
  }
  return out
}
