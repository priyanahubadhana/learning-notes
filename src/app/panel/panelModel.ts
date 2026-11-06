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
