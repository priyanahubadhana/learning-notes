import type {
  DBCore,
  DBCoreMutateRequest,
  DBCoreMutateResponse,
  DBCoreTable,
  DBCoreTransaction,
  Middleware,
} from 'dexie'
import type { Block, Page, SearchEntry } from '../core/types'
import { blockEntry, pageEntry, titleEntryId } from './searchText'

/**
 * Keeps the search index (`searchEntries`) in step with pages and blocks.
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
      if (name !== 'pages' && name !== 'blocks') return table
      const entries = () => down.table('searchEntries')
      return {
        ...table,
        mutate: (req) =>
          name === 'pages'
            ? mutatePages(table, entries(), req)
            : mutateBlocks(table, down.table('pages'), entries(), req),
      }
    },
  }),
}

/** Write transactions on notes also need the index (and pages, for blocks). */
function withIndexStores(stores: string[], mode: string): string[] {
  if (mode !== 'readwrite') return stores
  const extra = [
    ...(stores.includes('blocks') ? ['pages', 'searchEntries'] : []),
    ...(stores.includes('pages') ? ['searchEntries'] : []),
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

async function mutateBlocks(
  blocks: DBCoreTable,
  pages: DBCoreTable,
  entries: DBCoreTable,
  req: DBCoreMutateRequest,
): Promise<DBCoreMutateResponse> {
  const res = await blocks.mutate(req)
  const { trans } = req
  if (req.type === 'delete') {
    await apply(entries, trans, [], req.keys as string[])
    return res
  }
  const saved = written<Block>(req, res)
  if (saved.length === 0) return res

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
