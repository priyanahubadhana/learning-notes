import type { Block, JsonValue, Page, SearchEntry } from '../core/types'
import { noteLinkProps } from '../editor/mapping'
import { cardParts } from '../recall/cardService'

/**
 * Turning notes into search words. Pure functions shared by the index
 * middleware (every save), the backfill (upgrades) and queries, so a note
 * and a search are always split and folded the same way.
 */

/**
 * Bump when splitting/folding or entry contents change: rebuilds the index
 * (and the links and block tags lists, see links/linkRows.ts and
 * tags/tagRows.ts). 2 = links (Phase 4 Step 4), 3 = block tags (Step 5).
 */
export const SEARCH_INDEX_VERSION = 3

/** Longer "words" (e.g. pasted hashes) are cut to this many characters. */
const MAX_WORD_LENGTH = 40

/**
 * Optional marks removed so "Café" finds "cafe": Latin/Greek/Cyrillic
 * accents, Hebrew points and Arabic vowel marks. Marks that are part of a
 * letter in other scripts (e.g. Devanagari) are kept.
 */
const OPTIONAL_MARKS = /[̀-֑ͯ-ׇً-ٰٟ]/g

/** Lower case, optional marks removed (letters re-joined, e.g. Korean). */
export function fold(text: string): string {
  return text
    .toLowerCase() // before NFD so Turkish "İ" folds to "i"
    .normalize('NFD')
    .replace(OPTIONAL_MARKS, '')
    .normalize('NFC')
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' })

/**
 * The folded words of a text, each once, in order. Words are found by
 * `Intl.Segmenter`, so languages without spaces (Chinese, Japanese, Thai)
 * are split too. Text with no letters or digits has no words.
 */
export function searchWords(text: string): string[] {
  const words = new Set<string>()
  for (const part of segmenter.segment(fold(text))) {
    if (part.isWordLike) words.add(part.segment.slice(0, MAX_WORD_LENGTH))
  }
  return [...words]
}

/**
 * All text in a block's content: every `text` string in its rich text
 * (including links and table cells, at any depth) plus an image caption.
 */
export function blockText(content: Block['content']): string {
  const out: string[] = []
  const visit = (value: JsonValue | undefined) => {
    if (Array.isArray(value)) value.forEach(visit)
    else if (value && typeof value === 'object') {
      const link = noteLinkProps(value)
      if (link) {
        out.push(link.label) // the linked title, as it was when linked
        return
      }
      for (const [key, inner] of Object.entries(value)) {
        if (key === 'text' && typeof inner === 'string') out.push(inner)
        else visit(inner)
      }
    }
  }
  visit(content.text)
  if (typeof content.caption === 'string') out.push(content.caption)
  return out.join(' ')
}

/** Search entry id of a page's title. */
export const titleEntryId = (pageId: string) => `title:${pageId}`

/** The entry for a page title, or null when there is nothing to find. */
export function pageEntry(page: Page): SearchEntry | null {
  if (page.purgedAt !== undefined) return null
  const words = searchWords(page.title)
  if (words.length === 0) return null
  return {
    id: titleEntryId(page.id),
    kind: 'title',
    pageId: page.id,
    notebookId: page.notebookId,
    words,
    updatedAt: page.updatedAt,
    ...(page.deletedAt !== null && { deleted: true }),
  }
}

/**
 * The entry for a block, or null when there is nothing to find. A block
 * that makes cards (a Card, or text with blanks) ranks as a card.
 */
export function blockEntry(
  block: Block,
  notebookId: string,
): SearchEntry | null {
  if (block.purgedAt !== undefined) return null
  const words = searchWords(blockText(block.content))
  if (words.length === 0) return null
  return {
    id: block.id,
    kind: cardParts(block).length > 0 ? 'card' : 'text',
    pageId: block.pageId,
    notebookId,
    blockId: block.id,
    words,
    updatedAt: block.updatedAt,
    ...(block.deletedAt !== null && { deleted: true }),
  }
}
