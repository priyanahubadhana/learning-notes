import type { LearningNotesDB } from '../core/db'
import type { Notebook, Page } from '../core/types'

/**
 * Pause (E1): a paused notebook, page (with its sub-pages) or card stays out
 * of reviews; nothing is lost and Resume brings it back.
 *
 * A notebook or page is marked with an optional `paused` flag, and the ids of
 * everything paused are also kept in one `meta` row (`paused.ids`), so the
 * review queue checks a small set instead of scanning every notebook and page.
 * Single cards use `suspendedAt` (they already had it).
 */

const META_ID = 'paused.ids'

const readIds = async (db: LearningNotesDB): Promise<string[]> => {
  const row = await db.meta.get(META_ID)
  return Array.isArray(row?.value)
    ? row.value.filter((v): v is string => typeof v === 'string')
    : []
}

/** Ids of every paused notebook and page. */
export async function pausedIds(db: LearningNotesDB): Promise<Set<string>> {
  return new Set(await readIds(db))
}

/** Pauses a notebook or a page (its sub-pages follow by being inside it). */
export async function pauseItem(
  db: LearningNotesDB,
  kind: 'notebook' | 'page',
  id: string,
): Promise<void> {
  await setPaused(db, kind, id, true)
}

/** Brings a paused notebook or page back into reviews. */
export async function resumeItem(
  db: LearningNotesDB,
  kind: 'notebook' | 'page',
  id: string,
): Promise<void> {
  await setPaused(db, kind, id, false)
}

async function setPaused(
  db: LearningNotesDB,
  kind: 'notebook' | 'page',
  id: string,
  paused: boolean,
): Promise<void> {
  await db.transaction('rw', db.notebooks, db.pages, db.meta, async () => {
    const table = kind === 'notebook' ? db.notebooks : db.pages
    const row = await table.get(id)
    if (!row) return
    const next: Notebook | Page = { ...row, updatedAt: Date.now() }
    if (paused) next.paused = true
    else delete next.paused
    await table.put(next as never)
    const ids = new Set(await readIds(db))
    if (paused) ids.add(id)
    else ids.delete(id)
    await db.meta.put({ id: META_ID, value: [...ids] })
  })
}

/** A paused notebook or page, for the Paused list. */
export interface PausedItem {
  kind: 'notebook' | 'page'
  id: string
  title: string
  /** Pages: the notebook they are in. */
  notebookId?: string
}

/** Paused notebooks and pages that still exist, notebooks first. */
export async function listPaused(db: LearningNotesDB): Promise<PausedItem[]> {
  const ids = await readIds(db)
  if (ids.length === 0) return []
  const [notebooks, pages] = await Promise.all([
    db.notebooks.bulkGet(ids),
    db.pages.bulkGet(ids),
  ])
  const out: PausedItem[] = []
  for (const n of notebooks) {
    if (n && n.deletedAt === null) {
      out.push({ kind: 'notebook', id: n.id, title: n.title })
    }
  }
  for (const p of pages) {
    if (p && p.deletedAt === null) {
      out.push({
        kind: 'page',
        id: p.id,
        title: p.title,
        notebookId: p.notebookId,
      })
    }
  }
  return out
}

/**
 * Of these page ids, the ones inside a paused notebook or under a paused
 * page (at any depth). `notebookOf` is each page's notebook.
 */
export async function pausedPageIds(
  db: LearningNotesDB,
  pageIds: readonly string[],
  paused: ReadonlySet<string>,
): Promise<Set<string>> {
  const result = new Set<string>()
  if (paused.size === 0 || pageIds.length === 0) return result
  const known = new Map<string, Page | undefined>()
  const load = async (ids: string[]) => {
    const need = ids.filter((id) => !known.has(id))
    const rows = await db.pages.bulkGet(need)
    need.forEach((id, i) => known.set(id, rows[i]))
  }
  await load([...new Set(pageIds)])
  const verdict = new Map<string, boolean>()
  const check = async (id: string): Promise<boolean> => {
    // Walk up the parents; every step is cached.
    const chain: string[] = []
    let current: string | null = id
    let answer = false
    while (current !== null) {
      const done = verdict.get(current)
      if (done !== undefined) {
        answer = done
        break
      }
      await load([current])
      const page = known.get(current)
      if (!page) break
      chain.push(current)
      if (paused.has(page.id) || paused.has(page.notebookId)) {
        answer = true
        break
      }
      current = page.parentId
    }
    for (const c of chain) verdict.set(c, answer)
    return answer
  }
  for (const id of new Set(pageIds)) {
    if (await check(id)) result.add(id)
  }
  return result
}
