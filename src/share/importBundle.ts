import { inReadingOrder } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import { orderBetween } from '../core/order'
import { descendantIds, isLive } from '../core/records'
import type {
  Block,
  JsonValue,
  Notebook,
  Page,
  StoredImage,
} from '../core/types'
import { fromBase64 } from '../core/base64'
import { remapImageRefs } from '../images/imageRef'
import { rebuildRowRefs, rowNotebookIdOf } from '../databases/databaseService'
import { defaultNotebookTabs, studyTrackerId } from '../databases/notebookTabs'
import {
  createNotebook,
  findNotebookOfKind,
  listNotebooks,
} from '../notebooks/notebookService'
import { blockText } from '../search/searchText'
import { findOrCreateTagPath } from '../tags/tagService'
import { isTagColor, setTagColor } from '../tags/tagTools'
import { t } from '../i18n/t'
import type { Bundle } from './bundle'
import { remapJson } from './remapJson'

/**
 * Imports a bundle as NEW COPIES: every notebook, page, note, card,
 * database, column and view gets a fresh id, so nothing that exists is
 * ever changed or replaced. Links inside the file are re-pointed to the
 * copies; tags are matched by name (made if missing) because tags belong
 * to the whole workspace.
 */

export interface ImportSummary {
  notebooks: number
  pages: number
  cards: number
  databases: number
}

/**
 * A page's title, notes (type and words, in order) and sub-pages, as text
 * for comparing. Only words count, not formatting details or ids, and empty
 * text lines (the editor adds one at the end) are left out, so a template
 * that was only opened in the editor still equals its copy in a file.
 */
function signature(
  pageId: string,
  pages: readonly Page[],
  blocks: readonly Block[],
): string {
  const byOrder = <T extends { order: string }>(a: T, b: T) =>
    a.order < b.order ? -1 : a.order > b.order ? 1 : 0
  const page = pages.find((p) => p.id === pageId)
  return JSON.stringify([
    page?.title ?? '',
    inReadingOrder(
      blocks.filter((b) => b.pageId === pageId).sort(byOrder),
    ).flatMap((b) => {
      const text = blockText(b.content).replace(/s+/g, ' ').trim()
      return b.type === 'paragraph' && text === '' ? [] : [[b.type, text]]
    }),
    pages
      .filter((p) => p.parentId === pageId)
      .sort(byOrder)
      .map((p) => signature(p.id, pages, blocks)),
  ])
}

/** Every table an import may touch. */
const IMPORT_TABLES = (db: LearningNotesDB) => [
  db.workspaces,
  db.notebooks,
  db.pages,
  db.blocks,
  db.cards,
  db.reviewLogs,
  db.databases,
  db.dbColumns,
  db.dbViews,
  db.rowRefs,
  db.tags,
  db.meta,
  db.searchEntries,
  db.links,
  db.blockTags,
  db.images,
  db.inkLayers,
  db.inkChunks,
]

export interface ImportOptions {
  /** Keep the notebooks' and templates' own names (a layer), instead of "Copy of …". */
  keepNames?: boolean
  /** Filled with the ids of the notebooks, pages and databases made. */
  created?: { notebooks: string[]; pages: string[]; databases: string[] }
}

export async function importBundle(
  db: LearningNotesDB,
  workspaceId: string,
  bundle: Bundle,
  now: number = Date.now(),
  options: ImportOptions = {},
): Promise<ImportSummary> {
  // One transaction: a failed import leaves nothing behind, not even tags.
  return db.transaction('rw', IMPORT_TABLES(db), () =>
    importInTransaction(db, workspaceId, bundle, now, options),
  )
}

async function importInTransaction(
  db: LearningNotesDB,
  workspaceId: string,
  bundle: Bundle,
  now: number,
  options: ImportOptions,
): Promise<ImportSummary> {
  // Tags first: old tag id → live tag id here.
  // A tag made now gets the colour it had; one that already exists keeps its own.
  const ids = new Map<string, string>()
  const known = new Set((await db.tags.toArray()).map((tag) => tag.id))
  for (const tag of bundle.tags) {
    const live = await findOrCreateTagPath(db, tag.path)
    ids.set(tag.id, live.id)
    if (!known.has(live.id)) {
      known.add(live.id)
      if (tag.color && isTagColor(tag.color)) {
        await setTagColor(db, live.id, tag.color)
      }
    }
  }
  // The templates of a file are added to this workspace's Templates notebook.
  const templatesFrom = new Set(
    bundle.notebooks.filter((n) => n.kind === 'templates').map((n) => n.id),
  )
  if (templatesFrom.size > 0) {
    const home =
      (await findNotebookOfKind(db, workspaceId, 'templates')) ??
      (await createNotebook(db, workspaceId, 'Templates', 'templates'))
    for (const oldId of templatesFrom) ids.set(oldId, home.id)
  }
  // A template the workspace already has (same id, or same name and
  // content) is not added again; links to it point at the one that exists.
  const skipPages = new Set<string>()
  if (templatesFrom.size > 0) {
    const home = ids.get([...templatesFrom][0])!
    const have = (
      await db.pages.where('notebookId').equals(home).toArray()
    ).filter(isLive)
    const haveBlocks = (
      await db.blocks
        .where('pageId')
        .anyOf(have.map((p) => p.id))
        .toArray()
    ).filter(isLive)
    const ownTemplates = bundle.pages.filter((p) =>
      templatesFrom.has(p.notebookId),
    )
    const ownBlocks = bundle.blocks.filter((b) =>
      ownTemplates.some((p) => p.id === b.pageId),
    )
    for (const top of ownTemplates.filter((p) => p.parentId === null)) {
      const mine = signature(top.id, ownTemplates, ownBlocks)
      const same = have.find(
        (e) =>
          e.parentId === null &&
          (e.id === top.id || signature(e.id, have, haveBlocks) === mine),
      )
      if (!same) continue
      skipPages.add(top.id)
      for (const d of descendantIds(ownTemplates, top.id)) skipPages.add(d)
      ids.set(top.id, same.id)
    }
  }
  // Fresh ids for everything else.
  const fresh = (items: readonly { id: string }[]) =>
    items.forEach((item) => ids.set(item.id, createId()))
  fresh(bundle.notebooks.filter((n) => !templatesFrom.has(n.id)))
  fresh(bundle.pages.filter((p) => !skipPages.has(p.id)))
  fresh(bundle.blocks)
  fresh(bundle.cards)
  fresh(bundle.reviewLogs)
  fresh(bundle.dbColumns)
  fresh(bundle.dbViews)
  fresh(bundle.inkLayers)
  fresh(bundle.inkChunks)
  for (const database of bundle.databases) {
    // A Study tracker's id comes from its notebook's id.
    ids.set(
      database.id,
      database.kind === 'studyTracker' && database.notebookId
        ? studyTrackerId(ids.get(database.notebookId) ?? createId())
        : createId(),
    )
  }
  // Pictures come in as new records; notes and cells point at the new ids.
  const imageIds = new Map<string, string>()
  for (const image of bundle.images) imageIds.set(image.id, createId())
  const map = <T extends JsonValue>(value: T): T =>
    remapImageRefs(remapJson(value, ids), imageIds)
  const id = (old: string | null | undefined) =>
    old ? (ids.get(old) ?? old) : old

  const databaseIds = new Set(bundle.databases.map((d) => d.id))
  const notebookIds = new Set(bundle.notebooks.map((n) => n.id))

  await db.images.bulkAdd(
    bundle.images.map((image): StoredImage => ({
      id: imageIds.get(image.id)!,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      name: image.name,
      type: image.type,
      width: image.width,
      height: image.height,
      data: fromBase64(image.data),
    })),
  )
  const last = (await listNotebooks(db, workspaceId)).at(-1)
  let order = last?.order ?? null
  const notebooks = bundle.notebooks
    .filter((n) => !templatesFrom.has(n.id))
    .map((n): Notebook => {
      order = orderBetween(order, null)
      // Journal days come in as an ordinary notebook (a second journal
      // would clash with yours); its days are plain pages there.
      // (A copy of a sample notebook is the user's own, not "the sample".)
      const { kind: _kind, tabs: _tabs, sample: _sample, ...rest } = n
      void _kind
      void _tabs
      void _sample
      const newId = id(n.id)!
      return {
        ...rest,
        id: newId,
        workspaceId,
        title: options.keepNames
          ? n.title
          : t('import.copyName', { name: n.title }),
        order,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        tabs: defaultNotebookTabs(newId),
      }
    })
  await db.notebooks.bulkAdd(notebooks)

  const databases = bundle.databases.map((d) => ({
    ...d,
    id: id(d.id)!,
    workspaceId,
    notebookId:
      d.notebookId && notebookIds.has(d.notebookId) ? id(d.notebookId)! : null,
    ...(d.openViewId && { openViewId: id(d.openViewId)! }),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }))
  await db.databases.bulkAdd(databases)

  // Rows of loose databases live in the hidden "Databases" notebook.
  const homeFor = new Map<string, string>()
  for (const d of databases.filter((x) => x.notebookId === null)) {
    homeFor.set(d.id, await rowNotebookIdOf(db, d))
  }
  const pages = bundle.pages.flatMap((p) => {
    if (skipPages.has(p.id)) return []
    const databaseId =
      p.databaseId && databaseIds.has(p.databaseId)
        ? id(p.databaseId)!
        : undefined
    const notebookId = notebookIds.has(p.notebookId)
      ? id(p.notebookId)!
      : databaseId
        ? homeFor.get(databaseId)
        : undefined
    if (!notebookId) return []
    const {
      journalDate: _journalDate,
      journalMonth: _journalMonth,
      customTitle: _customTitle,
      templateRole: _templateRole,
      ...rest
    } = p
    void _journalDate
    void _journalMonth
    void _customTitle
    void _templateRole
    return [
      {
        ...rest,
        id: id(p.id)!,
        notebookId,
        parentId: id(p.parentId) ?? null,
        // A template of a file is a new template next to yours.
        ...(templatesFrom.has(p.notebookId) &&
          p.parentId === null && {
            title: options.keepNames
              ? p.title
              : t('import.copyName', { name: p.title }),
          }),
        ...(databaseId && { databaseId }),
        ...(p.tagIds && { tagIds: p.tagIds.map((x) => id(x)!) }),
        ...(p.values && { values: map(p.values) }),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ]
  })
  await db.pages.bulkAdd(pages)
  const pageIds = new Set(pages.map((p) => p.id))

  const blocks = bundle.blocks
    .filter((b) => pageIds.has(id(b.pageId)!))
    .map((b) => ({
      ...b,
      id: id(b.id)!,
      pageId: id(b.pageId)!,
      parentId: id(b.parentId) ?? null,
      content: map(b.content),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }))
  await db.blocks.bulkAdd(blocks)
  const blockIds = new Set(blocks.map((b) => b.id))

  const cards = bundle.cards
    .filter((c) => blockIds.has(id(c.blockId)!) && pageIds.has(id(c.pageId)!))
    .map((c) => ({
      ...c,
      id: id(c.id)!,
      blockId: id(c.blockId)!,
      pageId: id(c.pageId)!,
      notebookId: pages.find((p) => p.id === id(c.pageId))!.notebookId,
      ...(c.schedulerData && { schedulerData: map(c.schedulerData) }),
    }))
  await db.cards.bulkAdd(cards)
  // Ink comes with its pages (J1): layers and chunks get new ids and point at
  // the new page and note ids; strokes keep theirs (unique within a page).
  const layerRows = bundle.inkLayers
    .filter((l) => pageIds.has(id(l.pageId)!))
    .map((l) => ({
      ...l,
      id: id(l.id)!,
      pageId: id(l.pageId)!,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }))
  await db.inkLayers.bulkAdd(layerRows)
  const layerIds = new Set(layerRows.map((l) => l.id))
  await db.inkChunks.bulkAdd(
    bundle.inkChunks
      .filter((c) => pageIds.has(id(c.pageId)!) && layerIds.has(id(c.layerId)!))
      .map((c) => ({
        ...c,
        id: id(c.id)!,
        pageId: id(c.pageId)!,
        layerId: id(c.layerId)!,
        // A gone block keeps its old id: the chunk then uses its fallback spot.
        blockId: id(c.blockId) ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })),
  )
  const cardIds = new Set(cards.map((c) => c.id))
  await db.reviewLogs.bulkAdd(
    bundle.reviewLogs
      .filter((l) => cardIds.has(id(l.cardId)!))
      .map((l) => ({ ...l, id: id(l.id)!, cardId: id(l.cardId)! })),
  )

  const columns = bundle.dbColumns
    .filter((c) => databaseIds.has(c.databaseId))
    .map((c) => ({
      ...c,
      id: id(c.id)!,
      databaseId: id(c.databaseId)!,
      config: map(c.config),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }))
  await db.dbColumns.bulkAdd(columns)
  await db.dbViews.bulkAdd(
    bundle.dbViews
      .filter(
        (v) =>
          databaseIds.has(v.databaseId) &&
          (!v.blockId || blockIds.has(id(v.blockId)!)),
      )
      .map((v) => ({
        ...v,
        id: id(v.id)!,
        databaseId: id(v.databaseId)!,
        ...(v.blockId && { blockId: id(v.blockId)! }),
        config: map(v.config),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })),
  )
  await rebuildRowRefs(
    db,
    databases.map((d) => d.id),
  )
  if (options.created) {
    options.created.notebooks.push(...notebooks.map((n) => n.id))
    options.created.pages.push(...pages.map((p) => p.id))
    options.created.databases.push(...databases.map((d) => d.id))
  }
  return {
    notebooks: notebooks.length,
    pages: pages.length,
    cards: cards.length,
    databases: databases.length,
  }
}
