import { inReadingOrder, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { Block, JsonValue, LinkRef, Page } from '../core/types'
import {
  linkTargets,
  mapNoteLinks,
  noteLinkProps,
  type NoteLinkTarget,
  runText,
  toPlainText,
} from '../editor/mapping'
import { CARD_BLOCK_TYPE } from '../recall/cardService'
import { findMatches } from '../search/searchService'
import { searchWords } from '../search/searchText'

/**
 * Links between notes: what a link shows (current titles), what the [[
 * picker offers, and "Linked from". Reads the `links` helper list, which
 * the index middleware keeps up to date (see linkRows.ts).
 */

/** Blocks a link can point to inside a page. */
const TARGET_TYPES = new Set(['heading', CARD_BLOCK_TYPE])

/** Text of a heading/card used in a link ("Page › this"). */
function targetText(block: Block): string {
  return toPlainText(block.content).trim()
}

/** What a link shows right now. */
export interface ResolvedLink {
  /** 'trash': the page can be restored; 'gone': erased or missing. */
  state: 'live' | 'trash' | 'gone'
  /** The page's current title ('' when gone). */
  title: string
  /** The heading/card text; null for a page link, or a deleted target. */
  anchor: string | null
}

/**
 * The current title (and heading/card) of a link target. A deleted heading
 * or card falls back to the page.
 */
export async function resolveLink(
  db: LearningNotesDB,
  { pageId, blockId }: NoteLinkTarget,
): Promise<ResolvedLink> {
  const [page, block] = await Promise.all([
    db.pages.get(pageId),
    blockId ? db.blocks.get(blockId) : undefined,
  ])
  if (!page || page.purgedAt !== undefined) {
    return { state: 'gone', title: '', anchor: null }
  }
  if (page.deletedAt !== null) {
    return { state: 'trash', title: page.title, anchor: null }
  }
  const live = block && block.deletedAt === null && block.pageId === pageId
  return {
    state: 'live',
    title: page.title,
    anchor: live ? targetText(block) || null : null,
  }
}

/**
 * Copies of rich text whose note links carry the current title (› heading)
 * as their label, for read-only views such as Review. Links to deleted
 * pages keep the label they had.
 */
export async function withCurrentLabels(
  db: LearningNotesDB,
  values: JsonValue[],
): Promise<JsonValue[]> {
  const targets = new Map<string, NoteLinkTarget>()
  for (const value of values) {
    mapNoteLinks(value, (link) => {
      targets.set(`${link.pageId}|${link.blockId}`, link)
      return link
    })
  }
  if (targets.size === 0) return values
  const resolved = new Map(
    await Promise.all(
      [...targets].map(
        async ([key, target]) => [key, await resolveLink(db, target)] as const,
      ),
    ),
  )
  return values.map((value) =>
    mapNoteLinks(value, (link) => {
      const now = resolved.get(`${link.pageId}|${link.blockId}`)
      if (!now || now.state !== 'live') return link
      return { ...link, label: linkLabel(now.title, now.anchor) }
    })!,
  )
}

/** A page offered by the [[ picker. */
export interface LinkPageOption {
  pageId: string
  title: string
  notebookId: string
}

/**
 * Pages whose title contains every word of `text` (as word starts), best
 * first; Trash left out. Uses the search index (title entries only).
 */
export async function findLinkPages(
  db: LearningNotesDB,
  text: string,
  limit = 20,
): Promise<LinkPageOption[]> {
  const matches = (await findMatches(db, searchWords(text))).filter(
    (m) => m.entry.kind === 'title' && !m.entry.deleted,
  )
  matches.sort(
    (a, b) => b.score - a.score || b.entry.updatedAt - a.entry.updatedAt,
  )
  const pages = await db.pages.bulkGet(
    matches.slice(0, limit).map((m) => m.entry.pageId),
  )
  return pages.flatMap((p) =>
    p && p.deletedAt === null
      ? [{ pageId: p.id, title: p.title, notebookId: p.notebookId }]
      : [],
  )
}

/** Pages by id, in the given order, Trash left out (e.g. recent pages). */
export async function pagesByIds(
  db: LearningNotesDB,
  ids: string[],
): Promise<LinkPageOption[]> {
  const pages = await db.pages.bulkGet(ids)
  return pages.flatMap((p) =>
    p && p.deletedAt === null
      ? [{ pageId: p.id, title: p.title, notebookId: p.notebookId }]
      : [],
  )
}

/** A heading or card a link can point to. */
export interface LinkAnchorOption {
  blockId: string
  kind: 'heading' | 'card'
  text: string
}

/** The headings and cards of a page, in reading order (empty ones left out). */
export async function linkAnchors(
  db: LearningNotesDB,
  pageId: string,
): Promise<LinkAnchorOption[]> {
  return inReadingOrder(await listBlocks(db, pageId)).flatMap((b) => {
    if (!TARGET_TYPES.has(b.type)) return []
    const text = targetText(b)
    if (!text) return []
    return [
      { blockId: b.id, kind: b.type === 'heading' ? 'heading' : 'card', text },
    ]
  })
}

/** The label stored with a new link: "Title" or "Title › Heading". */
export function linkLabel(title: string, anchor?: string | null): string {
  return anchor ? `${title} › ${anchor}` : title
}

/** One block linking to a page, for "Linked from". */
export interface Backlink {
  blockId: string
  pageId: string
  pageTitle: string
  notebookId: string
  /** The sentence around the link: text before, the link, text after. */
  before: string
  link: string
  after: string
}

export interface Backlinks {
  /** Blocks (on other pages) linking here, in all. */
  total: number
  /** The first `limit` of them: recently changed pages first. */
  items: Backlink[]
}

/**
 * Blocks on other pages that link to `pageId` (or a heading/card on it),
 * each with the sentence around the link. Reads the links list by index;
 * only the blocks shown are loaded, so pages with many links stay fast.
 */
export async function getBacklinks(
  db: LearningNotesDB,
  pageId: string,
  limit = 20,
): Promise<Backlinks> {
  const rows = (await db.links.where('toPageId').equals(pageId).toArray())
    // Links within the page itself are not "from" anywhere.
    .filter((r) => r.fromPageId !== pageId)
  const byBlock = new Map<string, LinkRef>()
  for (const row of rows) {
    if (!byBlock.has(row.fromBlockId)) byBlock.set(row.fromBlockId, row)
  }

  // Recently changed pages first; pages in the Trash left out.
  const pageIds = [...new Set(rows.map((r) => r.fromPageId))]
  const pages = (await db.pages.bulkGet(pageIds)).filter(
    (p): p is Page => !!p && p.deletedAt === null,
  )
  pages.sort((a, b) => b.updatedAt - a.updatedAt)
  const live = new Set(pages.map((p) => p.id))
  const all = [...byBlock.values()].filter((r) => live.has(r.fromPageId))
  const rank = new Map(pages.map((p, i) => [p.id, i]))
  all.sort((a, b) => rank.get(a.fromPageId)! - rank.get(b.fromPageId)!)

  const shown = all.slice(0, limit)
  const blocks = (await db.blocks.bulkGet(shown.map((r) => r.fromBlockId)))
    .filter((b): b is Block => !!b && b.deletedAt === null)
    // Same page: in page order.
    .sort(
      (a, b) =>
        rank.get(a.pageId)! - rank.get(b.pageId)! ||
        (a.order < b.order ? -1 : a.order > b.order ? 1 : 0),
    )

  // Current titles of every page linked in the shown blocks.
  const linked = [
    ...new Set(blocks.flatMap((b) => linkTargets(b).map((t) => t.pageId))),
  ]
  const anchors = blocks.flatMap((b) =>
    linkTargets(b).flatMap((t) => (t.blockId ? [t.blockId] : [])),
  )
  const [linkedPages, anchorBlocks] = await Promise.all([
    db.pages.bulkGet(linked),
    db.blocks.bulkGet([...new Set(anchors)]),
  ])
  const titles = new Map(
    linkedPages.flatMap((p) =>
      p && p.deletedAt === null ? [[p.id, p.title]] : [],
    ),
  )
  const anchorText = new Map(
    anchorBlocks.flatMap((b) =>
      b && b.deletedAt === null ? [[b.id, targetText(b)]] : [],
    ),
  )
  const pageById = new Map(pages.map((p) => [p.id, p]))
  const showLink = (t: NoteLinkTarget, fallback: string) => {
    const title = titles.get(t.pageId)
    if (title === undefined) return fallback
    return linkLabel(title, anchorText.get(t.blockId))
  }

  return {
    total: all.length,
    items: blocks.map((block) => {
      const page = pageById.get(block.pageId)!
      return {
        blockId: block.id,
        pageId: page.id,
        pageTitle: page.title,
        notebookId: page.notebookId,
        ...sentenceAround(block, pageId, showLink),
      }
    }),
  }
}

/** Sentences of a text (by the browser's rules for the user's language). */
const sentences = new Intl.Segmenter(undefined, { granularity: 'sentence' })

/**
 * The sentence of a block around its first link to `pageId`. Every link
 * shows its current title (`showLink`); a page link block is just the link.
 */
export function sentenceAround(
  block: Pick<Block, 'type' | 'content'>,
  pageId: string,
  showLink: (target: NoteLinkTarget, label: string) => string,
): { before: string; link: string; after: string } {
  if (block.type === 'pageLink') {
    return {
      before: '',
      link: showLink({ pageId, blockId: '' }, ''),
      after: '',
    }
  }
  // The block's plain text, noting where the link to this page is.
  let text = ''
  let start = -1
  let end = -1
  const runs = Array.isArray(block.content.text) ? block.content.text : []
  for (const run of runs) {
    const link = noteLinkProps(run)
    if (link) {
      const shown = showLink(link, link.label)
      if (start < 0 && link.pageId === pageId) {
        start = text.length
        end = start + shown.length
      }
      text += shown
    } else if (run && typeof run === 'object' && 'content' in run) {
      // A web link: its own runs.
      const inner = (run as { content?: unknown }).content
      if (Array.isArray(inner)) text += inner.map(runText).join('')
    } else {
      text += runText(run)
    }
  }
  if (start < 0) return { before: text.trim(), link: '', after: '' }

  // Widen to the sentence(s) the link sits in.
  let from = 0
  let to = text.length
  for (const s of sentences.segment(text)) {
    const sEnd = s.index + s.segment.length
    if (sEnd <= start) from = sEnd
    else if (s.index >= end) {
      to = s.index
      break
    }
  }
  return {
    before: text.slice(from, start).trimStart(),
    link: text.slice(start, end),
    after: text.slice(end, to).trimEnd(),
  }
}
