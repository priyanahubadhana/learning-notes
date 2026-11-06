import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import { getLive, isLive, softDeleteMany } from '../core/records'
import type { Block, LayerInstall, Page } from '../core/types'
import { deleteDatabase } from '../databases/databaseService'
import { deleteNotebook } from '../notebooks/notebookService'
import { blockText } from '../search/searchText'
import { importBundle } from '../share/importBundle'
import { BundleError, bundleFile, exportNotebookBundle } from '../share/bundle'
import { t } from '../i18n/t'
import type { LayerFile, LayerManifest } from './manifest'

/**
 * I2 · Adding and removing layers. Adding makes ordinary notebooks and
 * databases (through the same import as "Add as copies") and remembers what
 * it made, with a hash of each item as it was added. Removing takes away
 * only the items whose hash is unchanged, so nothing you wrote is lost.
 */

/** Small, fast text hash (FNV-1a, 53 bits) written in base 36. */
export function hashText(text: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 ^ c, 0x85ebca6b)
  }
  return ((h1 >>> 0) * 0x200000 + ((h2 >>> 0) & 0x1fffff)).toString(36)
}

const byOrder = <T extends { order: string }>(a: T, b: T) =>
  a.order < b.order ? -1 : a.order > b.order ? 1 : 0

/** What a page is, for comparing: title, row cells and its notes' words. */
function pageSignature(page: Page, blocks: readonly Block[]): string {
  return JSON.stringify([
    page.title,
    page.values ?? null,
    blocks
      .filter(isLive)
      .sort(byOrder)
      .flatMap((b) => {
        const text = blockText(b.content).replace(/\s+/g, ' ').trim()
        // The editor adds an empty line at the end of a page it opened.
        return b.type === 'paragraph' && text === '' ? [] : [[b.type, text]]
      }),
  ])
}

async function hashPage(db: LearningNotesDB, page: Page): Promise<string> {
  const blocks = await db.blocks.where('pageId').equals(page.id).toArray()
  return hashText(pageSignature(page, blocks))
}

async function hashDatabase(
  db: LearningNotesDB,
  id: string,
): Promise<string | null> {
  const database = await db.databases.get(id)
  if (!database || !isLive(database)) return null
  const columns = (await db.dbColumns.where('databaseId').equals(id).toArray())
    .filter(isLive)
    .sort(byOrder)
    .map((c) => [c.name, c.type])
  return hashText(JSON.stringify([database.title, columns]))
}

async function hashNotebook(
  db: LearningNotesDB,
  id: string,
): Promise<string | null> {
  const notebook = await db.notebooks.get(id)
  if (!notebook || !isLive(notebook)) return null
  return hashText(notebook.title)
}

/** The live layers that were added, newest first. */
export async function listInstalls(
  db: LearningNotesDB,
): Promise<LayerInstall[]> {
  return (await db.layerInstalls.toArray())
    .filter(isLive)
    .sort((a, b) => b.installedAt - a.installedAt)
}

export async function installOf(
  db: LearningNotesDB,
  packId: string,
): Promise<LayerInstall | undefined> {
  return (await db.layerInstalls.where('packId').equals(packId).toArray()).find(
    isLive,
  )
}

/** Adds a layer as normal notebooks and databases. Refused when already added. */
export async function installLayer(
  db: LearningNotesDB,
  workspaceId: string,
  file: LayerFile,
  now: number = Date.now(),
): Promise<LayerInstall> {
  if (await installOf(db, file.manifest.id)) {
    throw new BundleError(t('layers.err.already', { name: file.manifest.name }))
  }
  const created = {
    notebooks: [] as string[],
    pages: [] as string[],
    databases: [] as string[],
  }
  await importBundle(db, workspaceId, file.bundle, now, {
    keepNames: true,
    created,
  })
  const createdIds: LayerInstall['createdIds'] = []
  for (const id of created.notebooks) {
    createdIds.push({
      table: 'notebooks',
      id,
      hash: (await hashNotebook(db, id)) ?? '',
    })
  }
  for (const id of created.databases) {
    createdIds.push({
      table: 'databases',
      id,
      hash: (await hashDatabase(db, id)) ?? '',
    })
  }
  for (const id of created.pages) {
    const page = await db.pages.get(id)
    if (page)
      createdIds.push({ table: 'pages', id, hash: await hashPage(db, page) })
  }
  const install: LayerInstall = {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    packId: file.manifest.id,
    version: file.manifest.version,
    name: file.manifest.name,
    installedAt: now,
    createdIds,
  }
  await db.layerInstalls.add(install)
  return install
}

export interface RemovalPlan {
  /** Items that are as they were added: Remove takes these away. */
  untouched: number
  /** Names of items you changed (or added to): Remove leaves these. */
  changed: string[]
}

interface Judged {
  plan: RemovalPlan
  removePages: string[]
  removeDatabases: string[]
  removeNotebooks: string[]
}

async function judge(
  db: LearningNotesDB,
  install: LayerInstall,
): Promise<Judged> {
  const changed: string[] = []
  let untouched = 0
  const removablePages = new Set<string>()
  const pageTitles = new Map<string, string>()
  for (const item of install.createdIds.filter((i) => i.table === 'pages')) {
    const page = await db.pages.get(item.id)
    if (!page || !isLive(page)) continue
    pageTitles.set(page.id, page.title)
    if ((await hashPage(db, page)) === item.hash) removablePages.add(page.id)
    else changed.push(page.title || t('review.untitled'))
  }
  const removeDatabases: string[] = []
  const removableDatabases = new Set<string>()
  for (const item of install.createdIds.filter(
    (i) => i.table === 'databases',
  )) {
    const hash = await hashDatabase(db, item.id)
    if (hash === null) continue
    if (hash === item.hash) removableDatabases.add(item.id)
    else changed.push((await db.databases.get(item.id))!.title)
  }
  const removeNotebooks: string[] = []
  for (const item of install.createdIds.filter(
    (i) => i.table === 'notebooks',
  )) {
    const hash = await hashNotebook(db, item.id)
    if (hash === null) continue
    if (hash !== item.hash) {
      changed.push((await db.notebooks.get(item.id))!.title)
      continue
    }
    // Whole notebook goes only if it holds nothing but removable items.
    const livePages = (
      await db.pages.where('notebookId').equals(item.id).toArray()
    ).filter(isLive)
    const liveDatabases = (
      await db.databases.where('notebookId').equals(item.id).toArray()
    ).filter(isLive)
    const clean =
      livePages.every((p) => removablePages.has(p.id)) &&
      liveDatabases.every((d) => removableDatabases.has(d.id))
    if (clean) {
      removeNotebooks.push(item.id)
      for (const p of livePages) removablePages.delete(p.id)
      for (const d of liveDatabases) removableDatabases.delete(d.id)
      untouched += 1 + livePages.length + liveDatabases.length
    } else {
      changed.push((await db.notebooks.get(item.id))!.title)
    }
  }
  untouched += removablePages.size
  for (const id of removableDatabases) removeDatabases.push(id)
  untouched += removableDatabases.size
  return {
    plan: { untouched, changed: [...new Set(changed)] },
    removePages: [...removablePages],
    removeDatabases,
    removeNotebooks,
  }
}

/** What Remove would do, without doing it. */
export async function planRemoval(
  db: LearningNotesDB,
  install: LayerInstall,
): Promise<RemovalPlan> {
  return (await judge(db, install)).plan
}

/**
 * Removes what the layer added and you never changed (into the Trash, so
 * it can still be restored). Anything changed stays. Returns the plan used.
 */
export async function removeLayer(
  db: LearningNotesDB,
  installId: string,
): Promise<RemovalPlan> {
  const install = await getLive(db.layerInstalls, installId)
  const judged = await judge(db, install)
  for (const id of judged.removeNotebooks) await deleteNotebook(db, id)
  for (const id of judged.removeDatabases) {
    const database = await db.databases.get(id)
    if (database && isLive(database)) await deleteDatabase(db, id)
  }
  const deletedAt = Date.now()
  await db.transaction('rw', db.pages, db.blocks, async () => {
    const pages = (await db.pages.bulkGet(judged.removePages)).filter(
      (p): p is Page => !!p && isLive(p),
    )
    const blockIds = (
      await db.blocks
        .where('pageId')
        .anyOf(pages.map((p) => p.id))
        .toArray()
    )
      .filter(isLive)
      .map((b) => b.id)
    await softDeleteMany(
      db.pages,
      pages.map((p) => p.id),
      deletedAt,
    )
    await softDeleteMany(db.blocks, blockIds, deletedAt)
  })
  await db.layerInstalls.update(install.id, {
    deletedAt,
    updatedAt: deletedAt,
  })
  return judged.plan
}

/** A notebook as a layer file friends can open with Add. */
export async function exportLayerFile(
  db: LearningNotesDB,
  notebookId: string,
  manifest: LayerManifest,
): Promise<Blob> {
  const bundle = await exportNotebookBundle(db, notebookId)
  const body = bundleFile(bundle).slice(1)
  return new Blob([`{"layer":${JSON.stringify(manifest)},`, body], {
    type: 'application/json',
  })
}

export const layerFileName = (manifest: Pick<LayerManifest, 'id'>): string =>
  `${manifest.id}.learningnotes-layer.json`

/** The manifest for sharing a notebook of your own as a layer file. */
export function shareManifest(
  notebook: { title: string },
  nonce: string = createId().slice(0, 4),
): LayerManifest {
  const slug = notebook.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return {
    id: `${slug || 'notebook'}-${nonce}`,
    version: 1,
    name: notebook.title.trim().slice(0, 80) || 'Notebook',
    description: '',
    adds: [],
  }
}
