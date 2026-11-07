import type { LearningNotesDB } from './db'
import { orderBetween, byOrder } from './order'
import {
  descendantIds,
  isLive,
  newRecordFields,
  purgeMany,
  softDeleteMany,
} from './records'
import type { Block, Notebook, NotebookTab, Page, SummaryItem } from './types'

/**
 * Summary lines (Phase M). A page's Summary is its own typed paragraph
 * (`Page.summary`) plus lines. A line is either linked to a note line (it
 * shows that line's live text) or typed on its own. Notebook and app
 * Summaries are views over the same rows; nothing is copied.
 */

export const MAX_LINE_LENGTH = 2000
export const MAX_LINES_PER_PAGE = 500

/** Link-back addresses a line may keep: https or an address inside the app. */
export function isSafeHref(href: string): boolean {
  return (
    href.length <= MAX_LINE_LENGTH &&
    (href.startsWith('https://') || href.startsWith('#/'))
  )
}

/** The words of a block's rich text (links and nested runs included). */
export function lineText(content: Block['content']): string {
  const out: string[] = []
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(visit)
    else if (value && typeof value === 'object') {
      const run = value as Record<string, unknown>
      if (typeof run.text === 'string') out.push(run.text)
      else if (run.type === 'link') visit(run.content)
    }
  }
  visit((content as { text?: unknown } | undefined)?.text)
  return out.join('').replace(/\s+/g, ' ').trim()
}

const cut = (text: string) => text.trim().slice(0, MAX_LINE_LENGTH)

async function lastOrder(db: LearningNotesDB, pageId: string) {
  const rows = (await db.summaryItems.where('pageId').equals(pageId).toArray())
    .filter(isLive)
    .sort(byOrder)
  return { rows, last: rows.length ? rows[rows.length - 1].order : null }
}

export type AddResult =
  | { status: 'added' | 'exists'; item: SummaryItem }
  | { status: 'empty' | 'full' }

/**
 * "Add to Summary": links the note line `blockId` into `pageId`'s Summary
 * (the block's own page by default). The same line is kept once.
 */
export async function addBlockToSummary(
  db: LearningNotesDB,
  blockId: string,
  pageId?: string,
  fallbackText?: string,
): Promise<AddResult> {
  return db.transaction(
    'rw',
    db.summaryItems,
    db.blocks,
    db.pages,
    async () => {
      const block = await db.blocks.get(blockId)
      const targetId = pageId ?? block?.pageId
      const page = targetId ? await db.pages.get(targetId) : undefined
      if (!page || !isLive(page)) return { status: 'empty' }
      // The editor saves a moment after typing, so a very new line may not be
      // stored yet: its words come from the editor then.
      const text = cut(
        block && block.deletedAt === null
          ? lineText(block.content)
          : (fallbackText ?? ''),
      )
      if (!text) return { status: 'empty' }
      const { rows, last } = await lastOrder(db, page.id)
      const same = rows.find((r) => r.sourceBlockId === blockId)
      if (same) return { status: 'exists', item: same }
      if (rows.length >= MAX_LINES_PER_PAGE) return { status: 'full' }
      const now = Date.now()
      const item: SummaryItem = {
        ...newRecordFields(),
        createdAt: now,
        updatedAt: now,
        pageId: page.id,
        notebookId: page.notebookId,
        order: orderBetween(last, null),
        text,
        sourceBlockId: blockId,
      }
      await db.summaryItems.add(item)
      return { status: 'added', item }
    },
  )
}

/** Adds a typed line (and, for a saved highlight, its link back). */
export async function addOwnLine(
  db: LearningNotesDB,
  pageId: string,
  text: string,
  link?: { href: string; where: string },
): Promise<AddResult> {
  return db.transaction('rw', db.summaryItems, db.pages, async () => {
    const page = await db.pages.get(pageId)
    const clean = cut(text)
    if (!page || !isLive(page) || !clean) return { status: 'empty' }
    const { rows, last } = await lastOrder(db, pageId)
    if (rows.length >= MAX_LINES_PER_PAGE) return { status: 'full' }
    const item: SummaryItem = {
      ...newRecordFields(),
      pageId,
      notebookId: page.notebookId,
      order: orderBetween(last, null),
      text: clean,
      ...(link && isSafeHref(link.href)
        ? { href: link.href, where: link.where.slice(0, 200) }
        : {}),
    }
    await db.summaryItems.add(item)
    return { status: 'added', item }
  })
}

/** Changes the words of an own line. A linked line is edited in its note. */
export async function updateOwnLine(
  db: LearningNotesDB,
  id: string,
  text: string,
): Promise<void> {
  const item = await db.summaryItems.get(id)
  if (!item || !isLive(item) || item.sourceBlockId) return
  const clean = cut(text)
  if (!clean || clean === item.text) return
  await db.summaryItems.update(id, { text: clean, updatedAt: Date.now() })
}

/** Takes a line out of the Summary (the note itself is not touched). */
export async function removeLine(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await softDeleteMany(db.summaryItems, [id], Date.now())
}

/** One line as shown: its words now, and whether its note is gone. */
export interface SummaryLine {
  item: SummaryItem
  text: string
  linked: boolean
  /** Linked, but the note line was deleted: the saved words are shown. */
  missing: boolean
}

/** A page's part of a Summary: its own paragraph and its lines. */
export interface SummaryGroup {
  page: Page
  ownText: string
  lines: SummaryLine[]
}

export type SummaryScope =
  | { kind: 'page'; pageId: string }
  | { kind: 'notebook'; notebookId: string }
  /** Every notebook, or one. */
  | { kind: 'app'; notebookId?: string | null }

/** Pages in tree order (parents before children, siblings by order). */
function treeOrder(pages: readonly Page[]): Page[] {
  const kids = new Map<string | null, Page[]>()
  const ids = new Set(pages.map((p) => p.id))
  for (const p of pages) {
    const key = p.parentId && ids.has(p.parentId) ? p.parentId : null
    kids.set(key, [...(kids.get(key) ?? []), p])
  }
  const out: Page[] = []
  const walk = (key: string | null) => {
    for (const p of (kids.get(key) ?? []).sort(byOrder)) {
      out.push(p)
      walk(p.id)
    }
  }
  walk(null)
  return out
}

/**
 * The Summary of a page (with its sub-pages), a notebook or the whole app:
 * groups of pages that have a paragraph or lines, in tree order.
 */
export async function listSummary(
  db: LearningNotesDB,
  scope: SummaryScope,
): Promise<SummaryGroup[]> {
  let pages: Page[]
  if (scope.kind === 'page') {
    const root = await db.pages.get(scope.pageId)
    if (!root || !isLive(root)) return []
    const all = (
      await db.pages.where('notebookId').equals(root.notebookId).toArray()
    ).filter(isLive)
    const ids = new Set([root.id, ...descendantIds(all, root.id)])
    pages = treeOrder(all.filter((p) => ids.has(p.id)))
  } else if (scope.kind === 'notebook' || scope.notebookId) {
    const id = scope.kind === 'notebook' ? scope.notebookId : scope.notebookId!
    pages = treeOrder(
      (await db.pages.where('notebookId').equals(id).toArray()).filter(isLive),
    )
  } else {
    const notebooks = (await db.notebooks.toArray())
      .filter((n) => isLive(n) && n.kind !== 'templates')
      .sort(byOrder)
    const all = (await db.pages.toArray()).filter(isLive)
    pages = notebooks.flatMap((n) =>
      treeOrder(all.filter((p) => p.notebookId === n.id)),
    )
  }
  const byPage = new Map(pages.map((p) => [p.id, p]))
  const items = (
    await db.summaryItems
      .where('pageId')
      .anyOf([...byPage.keys()])
      .toArray()
  )
    .filter(isLive)
    .sort(byOrder)
  const blockIds = items.flatMap((i) =>
    i.sourceBlockId ? [i.sourceBlockId] : [],
  )
  const blocks = new Map(
    (await db.blocks.bulkGet(blockIds))
      .filter((b): b is Block => !!b && b.deletedAt === null)
      .map((b) => [b.id, b]),
  )
  const lines = new Map<string, SummaryLine[]>()
  for (const item of items) {
    const block = item.sourceBlockId
      ? blocks.get(item.sourceBlockId)
      : undefined
    const live = block ? lineText(block.content) : ''
    const line: SummaryLine = {
      item,
      linked: !!item.sourceBlockId,
      missing: !!item.sourceBlockId && !live,
      text: live || item.text,
    }
    lines.set(item.pageId, [...(lines.get(item.pageId) ?? []), line])
  }
  return pages
    .map((page) => ({
      page,
      ownText: page.summary ?? '',
      lines: lines.get(page.id) ?? [],
    }))
    .filter((g) => g.ownText.trim() !== '' || g.lines.length > 0)
}

/** Delete forever: erases the Summary lines of these pages, and lines elsewhere linked to their notes. */
export async function purgeSummaryOf(
  db: LearningNotesDB,
  pageIds: readonly string[],
  now: number,
): Promise<void> {
  const blockIds = await db.blocks
    .where('pageId')
    .anyOf([...pageIds])
    .primaryKeys()
  const own = await db.summaryItems
    .where('pageId')
    .anyOf([...pageIds])
    .toArray()
  const linked = await db.summaryItems
    .where('sourceBlockId')
    .anyOf(blockIds as string[])
    .toArray()
  const ids = new Set(
    [...own, ...linked]
      .filter((r) => r.purgedAt === undefined)
      .map((r) => r.id),
  )
  await purgeMany(
    db.summaryItems,
    [...ids],
    {
      text: '',
      href: undefined,
      where: undefined,
      sourceBlockId: undefined,
      deletedAt: now,
    },
    now,
  )
}

/** The Summary tab of a notebook. */
export const SUMMARY_TAB: NotebookTab = { id: 'summary', kind: 'summary' }

/**
 * Notebooks made before Phase M have no Summary tab: adds it once, after
 * the Notes tab. A tab that exists (even hidden) is never added again.
 */
export async function ensureSummaryTab(
  db: LearningNotesDB,
  notebook: Notebook,
): Promise<void> {
  const tabs = notebook.tabs
  if (!tabs || tabs.some((tab) => tab.kind === 'summary')) return
  const at = tabs.findIndex((tab) => tab.kind === 'notes') + 1
  await db.notebooks.update(notebook.id, {
    tabs: [...tabs.slice(0, at), { ...SUMMARY_TAB }, ...tabs.slice(at)],
    updatedAt: Date.now(),
  })
}
