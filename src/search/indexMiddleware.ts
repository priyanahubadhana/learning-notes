import type {
  DBCore,
  DBCoreMutateRequest,
  DBCoreMutateResponse,
  DBCoreTable,
  DBCoreTransaction,
  Middleware,
} from 'dexie'
import type { Block, Page, SearchEntry } from '../core/types'
import { linkRowRange, linkRows } from '../links/linkRows'
import { blockTagRowRange, blockTagRows } from '../tags/tagRows'
import type { InkChunk } from '../core/inkTypes'
import {
  blockEntry,
  inkEntry,
  inkEntryId,
  pageEntry,
  titleEntryId,
} from './searchText'

/**
 * Keeps the search index (`searchEntries`), the links list (`links`) and
 * the block tags list (`blockTags`) in step with pages and blocks.
 *
 * A Dexie middleware sees every write to `pages` and `blocks`, from any
 * service, and updates the matching entries inside the same transaction:
 * if the save fails, the index change is undone with it. New features that
 * write notes need no search code. Tables the index needs are added to each
 * write transaction automatically.
 *
 * Hard deletes remove the entries. Clearing a whole table (`deleteRange`)
 * is not used by the app and is left to a rebuild (`ensureSearchIndex`).
 */
export const searchIndexMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'searchIndex',
  create: (down) => ({
    ...down,
    transaction: (stores, mode, options) =>
      down.transaction(withIndexStores(stores, mode), mode, options),
    table: (name) => {
      const table = down.table(name)
      if (name !== 'pages' && name !== 'blocks' && name !== 'inkChunks') {
        return table
      }
      const entries = () => down.table('searchEntries')
      return {
        ...table,
        mutate: (req) =>
          name === 'pages'
            ? mutatePages(table, entries(), req)
            : name === 'inkChunks'
              ? mutateInk(table, down.table('pages'), entries(), req)
              : mutateBlocks(
                  table,
                  down.table('pages'),
                  entries(),
                  down.table('links'),
                  down.table('blockTags'),
                  req,
                ),
      }
    },
  }),
}

/** Write transactions on notes also need the index (and blocks' lists). */
function withIndexStores(stores: string[], mode: string): string[] {
  if (mode !== 'readwrite') return stores
  const extra = [
    ...(stores.includes('blocks')
      ? ['pages', 'searchEntries', 'links', 'blockTags']
      : []),
    ...(stores.includes('pages') ? ['searchEntries'] : []),
    ...(stores.includes('inkChunks') ? ['pages', 'searchEntries'] : []),
  ]
  return extra.every((s) => stores.includes(s))
    ? stores
    : [...new Set([...stores, ...extra])]
}

/** Values the write really stored (failed items left out). */
function written<T>(req: DBCoreMutateRequest, res: DBCoreMutateResponse): T[] {
  if (req.type !== 'add' && req.type !== 'put') return []
  return req.values.filter((_, i) => !(i in res.failures)) as T[]
}

/** Puts entries and removes `emptyIds` (records with nothing to find). */
async function apply(
  entries: DBCoreTable,
  trans: DBCoreTransaction,
  put: SearchEntry[],
  emptyIds: string[],
): Promise<void> {
  if (put.length > 0) await entries.mutate({ type: 'put', trans, values: put })
  if (emptyIds.length > 0) {
    await entries.mutate({ type: 'delete', trans, keys: emptyIds })
  }
}

/** Replaces a helper list's rows of these blocks (`rangeOf`) with `put`. */
async function replaceRows(
  rows: DBCoreTable,
  trans: DBCoreTransaction,
  blockIds: string[],
  rangeOf: (blockId: string) => [string, string],
  put: object[],
): Promise<void> {
  for (const id of blockIds) {
    const [lower, upper] = rangeOf(id)
    await rows.mutate({
      type: 'deleteRange',
      trans,
      range: { type: 2 /* DBCoreRangeType.Range */, lower, upper },
    })
  }
  if (put.length > 0) await rows.mutate({ type: 'put', trans, values: put })
}

async function mutateBlocks(
  blocks: DBCoreTable,
  pages: DBCoreTable,
  entries: DBCoreTable,
  links: DBCoreTable,
  blockTags: DBCoreTable,
  req: DBCoreMutateRequest,
): Promise<DBCoreMutateResponse> {
  const res = await blocks.mutate(req)
  const { trans } = req
  if (req.type === 'delete') {
    const keys = req.keys as string[]
    await apply(entries, trans, [], keys)
    await replaceRows(links, trans, keys, linkRowRange, [])
    await replaceRows(blockTags, trans, keys, blockTagRowRange, [])
    return res
  }
  const saved = written<Block>(req, res)
  if (saved.length === 0) return res
  const ids = saved.map((b) => b.id)
  await replaceRows(links, trans, ids, linkRowRange, saved.flatMap(linkRows))
  await replaceRows(
    blockTags,
    trans,
    ids,
    blockTagRowRange,
    saved.flatMap(blockTagRows),
  )

  // Blocks only know their page; the entry also stores the notebook. A page
  // not saved yet gets its notebook filled in when it is (mutatePages).
  const pageIds = [...new Set(saved.map((b) => b.pageId))]
  const found = (await pages.getMany({ trans, keys: pageIds })) as (
    Page | undefined
  )[]
  const notebookOf = new Map(pageIds.map((id, i) => [id, found[i]?.notebookId]))

  const put: SearchEntry[] = []
  const empty: string[] = []
  for (const block of saved) {
    const entry = blockEntry(block, notebookOf.get(block.pageId) ?? '')
    if (entry) put.push(entry)
    else empty.push(block.id)
  }
  await apply(entries, trans, put, empty)
  return res
}

/**
 * Drawing labels (G3): after chunks are written, the page's one `ink:` entry
 * is made again from all the page's chunks (or removed when none has a
 * label). Hard deletes of chunks are not used (they are soft-deleted).
 */
async function mutateInk(
  chunks: DBCoreTable,
  pages: DBCoreTable,
  entries: DBCoreTable,
  req: DBCoreMutateRequest,
): Promise<DBCoreMutateResponse> {
  const res = await chunks.mutate(req)
  const saved = written<InkChunk>(req, res)
  if (saved.length === 0) return res
  const { trans } = req
  const pageIds = [...new Set(saved.map((c) => c.pageId))]
  const found = (await pages.getMany({ trans, keys: pageIds })) as (
    Page | undefined
  )[]
  const put: SearchEntry[] = []
  const empty: string[] = []
  for (const [i, pageId] of pageIds.entries()) {
    const all = (
      await chunks.query({
        trans,
        values: true,
        query: {
          index: chunks.schema.getIndexByKeyPath('pageId')!,
          range: {
            type: 1 /* DBCoreRangeType.Equal */,
            lower: pageId,
            upper: pageId,
          },
        },
      })
    ).result as InkChunk[]
    const page = found[i]
    const entry = inkEntry(
      {
        id: pageId,
        notebookId: page?.notebookId ?? '',
        deletedAt: page?.deletedAt ?? null,
      },
      all,
    )
    if (entry) put.push(entry)
    else empty.push(inkEntryId(pageId))
  }
  await apply(entries, trans, put, empty)
  return res
}

async function mutatePages(
  pages: DBCoreTable,
  entries: DBCoreTable,
  req: DBCoreMutateRequest,
): Promise<DBCoreMutateResponse> {
  const { trans } = req
  // Notebooks before the write, to spot pages that changed notebook.
  const before =
    req.type === 'put'
      ? ((await pages.getMany({
          trans,
          keys: (req.values as Page[]).map((p) => p.id),
        })) as (Page | undefined)[])
      : []
  const res = await pages.mutate(req)
  if (req.type === 'delete') {
    await apply(entries, trans, [], (req.keys as string[]).map(titleEntryId))
    return res
  }
  const saved = written<Page>(req, res)
  if (saved.length === 0) return res

  const put: SearchEntry[] = []
  const empty: string[] = []
  for (const page of saved) {
    const entry = pageEntry(page)
    if (entry) put.push(entry)
    else empty.push(titleEntryId(page.id))
  }

  // Trashing or restoring a page does not touch its drawings, so the page's
  // drawing-label entry follows the page's Trash state here.
  const inkRows = (await entries.getMany({
    trans,
    keys: saved.map((p) => inkEntryId(p.id)),
  })) as (SearchEntry | undefined)[]
  inkRows.forEach((row, i) => {
    if (!row) return
    const trashed = saved[i].deletedAt !== null
    if (!!row.deleted === trashed) return
    const { deleted: _old, ...rest } = row
    void _old
    put.push(trashed ? { ...rest, deleted: true } : rest)
  })

  // New pages, and pages moved to another notebook: their block entries
  // carry the notebook too.
  const oldNotebook = new Map(before.map((p) => [p?.id, p?.notebookId]))
  for (const page of saved) {
    if (oldNotebook.get(page.id) === page.notebookId) continue
    const stale = (
      await entries.query({
        trans,
        values: true,
        query: {
          index: entries.schema.getIndexByKeyPath('pageId')!,
          range: {
            type: 1 /* DBCoreRangeType.Equal */,
            lower: page.id,
            upper: page.id,
          },
        },
      })
    ).result as SearchEntry[]
    for (const entry of stale) {
      if (entry.kind !== 'title' && entry.notebookId !== page.notebookId) {
        put.push({ ...entry, notebookId: page.notebookId })
      }
    }
  }
  await apply(entries, trans, put, empty)
  return res
}
