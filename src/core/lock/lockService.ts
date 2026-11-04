import type { LearningNotesDB } from '../db'
import type { Database, Notebook, Page } from '../types'
import { getLockConfig, LOCK_CONFIG_ID, methodsOf } from './lockConfig'
import { isUnlocked } from './lockState'
import { forgetPasskey, hasPasskey } from './webauthn'

/**
 * What is locked, and the checks every screen uses before it shows content.
 * A lock is the optional flag `locked: true` on a page, a notebook or a
 * database (no index and no database upgrade; lists scan once, on the
 * Settings › Lock screen only). A locked notebook locks all its pages; a
 * locked database locks its rows.
 */

export type LockKind = 'page' | 'notebook' | 'database'

const table = (db: LearningNotesDB, kind: LockKind) =>
  kind === 'page' ? db.pages : kind === 'notebook' ? db.notebooks : db.databases

/** Locks or unlocks (removes the lock from) one thing. */
export async function setLocked(
  db: LearningNotesDB,
  kind: LockKind,
  id: string,
  on: boolean,
): Promise<void> {
  const t = table(db, kind) as unknown as {
    update: (id: string, changes: object) => Promise<number>
  }
  await t.update(id, { locked: on ? true : undefined, updatedAt: Date.now() })
}

export interface LockedItems {
  pages: Page[]
  notebooks: Notebook[]
  databases: Database[]
}

/** Everything that carries a lock (one scan; for Settings › Lock only). */
export async function listLocked(db: LearningNotesDB): Promise<LockedItems> {
  const [pages, notebooks, databases] = await Promise.all([
    db.pages.filter((p) => p.locked === true && p.deletedAt === null).toArray(),
    db.notebooks
      .filter((n) => n.locked === true && n.deletedAt === null)
      .toArray(),
    db.databases
      .filter((d) => d.locked === true && d.deletedAt === null)
      .toArray(),
  ])
  return { pages, notebooks, databases }
}

/** Takes the lock off everything and deletes the codes and this device's passkey. */
export async function removeAllLocks(db: LearningNotesDB): Promise<void> {
  const items = await listLocked(db)
  const now = Date.now()
  await db.transaction(
    'rw',
    [db.pages, db.notebooks, db.databases, db.settings],
    async () => {
      for (const p of items.pages)
        await db.pages.update(p.id, { locked: undefined, updatedAt: now })
      for (const n of items.notebooks)
        await db.notebooks.update(n.id, { locked: undefined, updatedAt: now })
      for (const d of items.databases)
        await db.databases.update(d.id, { locked: undefined, updatedAt: now })
      await db.settings.put({ id: LOCK_CONFIG_ID, value: {}, updatedAt: now })
    },
  )
  forgetPasskey()
}

/** True when at least one way to unlock exists on this device. */
export async function lockIsActive(db: LearningNotesDB): Promise<boolean> {
  const m = methodsOf(await getLockConfig(db), hasPasskey())
  return m.pin || m.password || m.passkey
}

/**
 * The id that carries the lock for a place (the page, else its notebook,
 * else its database), or null when nothing in the chain is locked.
 */
export function lockRoot(
  page: Pick<Page, 'id' | 'locked'> | undefined,
  notebook: Pick<Notebook, 'id' | 'locked'> | undefined,
  database?: Pick<Database, 'id' | 'locked'> | undefined,
): string | null {
  if (page?.locked) return page.id
  if (notebook?.locked) return notebook.id
  if (database?.locked) return database.id
  return null
}

/** Every id in the chain page → notebook → database (what stays open together). */
export async function lockChainIds(
  db: LearningNotesDB,
  place: { pageId?: string; notebookId?: string; databaseId?: string },
): Promise<string[]> {
  const page = place.pageId ? await db.pages.get(place.pageId) : undefined
  const ids = [
    place.pageId,
    page?.notebookId ?? place.notebookId,
    page?.databaseId ?? place.databaseId,
  ]
  return ids.filter((id): id is string => !!id)
}

/**
 * The pages (of those given) whose content must not show now: they are
 * locked, the lock is set up and they have not been unlocked.
 */
export async function hiddenPageIds(
  db: LearningNotesDB,
  pageIds: readonly string[],
): Promise<Set<string>> {
  const hidden = new Set<string>()
  if (pageIds.length === 0 || !(await lockIsActive(db))) return hidden
  const unique = [...new Set(pageIds)]
  const pages = await db.pages.bulkGet(unique)
  const notebooks = new Map(
    (
      await db.notebooks.bulkGet([
        ...new Set(pages.flatMap((p) => (p ? [p.notebookId] : []))),
      ])
    ).flatMap((n) => (n ? [[n.id, n] as const] : [])),
  )
  const databases = new Map(
    (
      await db.databases.bulkGet([
        ...new Set(pages.flatMap((p) => (p?.databaseId ? [p.databaseId] : []))),
      ])
    ).flatMap((d) => (d ? [[d.id, d] as const] : [])),
  )
  for (const page of pages) {
    if (!page) continue
    const root = lockRoot(
      page,
      notebooks.get(page.notebookId),
      page.databaseId ? databases.get(page.databaseId) : undefined,
    )
    if (root && !isUnlocked(root)) hidden.add(page.id)
  }
  return hidden
}
