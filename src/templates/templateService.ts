import { copyBlocks, deleteBlock, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { byOrder, orderAtIndex } from '../core/order'
import { stableId } from '../core/ids'
import { isLive, newRecordFields } from '../core/records'
import type { Block, JsonObject, Notebook, OrderKey, Page } from '../core/types'
import {
  linkTargets,
  mapNoteLinks,
  type NoteLinkProps,
  toPlainText,
} from '../editor/mapping'
import {
  createNotebook,
  findNotebookOfKind,
} from '../notebooks/notebookService'
import { createPage, getPage, listChildPages } from '../pages/pageService'
import { syncCardRecords } from '../recall/cardService'
import {
  STARTER_VERSION,
  starterTemplates,
  type StarterPage,
} from './starterTemplates'

/**
 * Templates are normal pages inside a special "Templates" notebook, so they
 * are edited like any page. Using a template copies its blocks.
 */

/** Records collected in memory, then written with one bulk write each. */
interface StarterBatch {
  pages: Page[]
  blocks: Block[]
}

/**
 * Builds one starter page (and its sub-pages) from its definition, in
 * memory only. Fast start: one write per record cost ~600 IndexedDB
 * round-trips on iPad Safari; the caller writes the whole batch at once.
 * `siblingOrders` are the order keys already used under `parentId`.
 */
async function buildStarterPage(
  db: LearningNotesDB,
  batch: StarterBatch,
  notebookId: string,
  parentId: string | null,
  siblingOrders: OrderKey[],
  starter: StarterPage & { role?: 'daily'; children?: StarterPage[] },
  /** A fixed id (the daily template's). */
  fixedId?: string,
): Promise<string> {
  const order = orderAtIndex(siblingOrders, siblingOrders.length)
  siblingOrders.push(order)
  const page: Page = {
    ...newRecordFields(),
    ...(fixedId && { id: fixedId }),
    notebookId,
    parentId,
    title: starter.title,
    order,
    ...(starter.role && { templateRole: starter.role }),
  }
  batch.pages.push(page)
  const childIds: string[] = []
  const childOrders: OrderKey[] = []
  for (const child of starter.children ?? []) {
    childIds.push(
      await buildStarterPage(
        db,
        batch,
        notebookId,
        page.id,
        childOrders,
        child,
      ),
    )
  }
  const addBlock = (
    type: string,
    content: JsonObject,
    blockParentId: string | null,
    orders: OrderKey[],
  ): Block => {
    const blockOrder = orderAtIndex(orders, orders.length)
    orders.push(blockOrder)
    const made: Block = {
      ...newRecordFields(),
      pageId: page.id,
      parentId: blockParentId,
      type,
      content,
      order: blockOrder,
    }
    batch.blocks.push(made)
    return made
  }
  const topOrders: OrderKey[] = []
  for (const block of starter.blocks) {
    // A link to "child N" (see childLink) points at that sub-page's id.
    const { childIndex } = block.content
    const content =
      typeof childIndex === 'number'
        ? { pageId: childIds[childIndex] }
        : block.content
    const made = addBlock(block.type, content, null, topOrders)
    // Nested blocks (e.g. a card's answer).
    const nestedOrders: OrderKey[] = []
    for (const child of block.children ?? []) {
      addBlock(child.type, child.content, made.id, nestedOrders)
    }
  }
  return page.id
}

/**
 * Returns the Templates notebook, creating it (with the starter templates)
 * the first time. Older workspaces get starters added since their version
 * once (upgrade), so a deleted starter never comes back.
 */
export async function ensureTemplates(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<Notebook> {
  const notebook = await db.transaction(
    'rw',
    [db.workspaces, db.notebooks],
    async () => {
      const found = await findNotebookOfKind(db, workspaceId, 'templates')
      if (found) return found
      // Version 0 = "starters not all written yet", so a cut-short first run
      // is finished by the next one.
      const made = await createNotebook(
        db,
        workspaceId,
        'Templates',
        'templates',
      )
      await db.notebooks.update(made.id, { starterVersion: 0 })
      return { ...made, starterVersion: 0 }
    },
  )
  const seeded = notebook.starterVersion ?? 1
  if (seeded >= STARTER_VERSION) return notebook
  return seedStarters(db, notebook, seeded)
}

/**
 * Writes the missing starters, one bulk write per table for each starter
 * (about 600 single writes took ~14 s on iPad Safari). Each starter is its
 * own short transaction so the app stays usable meanwhile. A run that was
 * cut short (or two runs at once) finds the starters already written (also
 * deleted ones, by their title) and adds only the rest, never doubles.
 */
async function seedStarters(
  db: LearningNotesDB,
  notebook: Notebook,
  seeded: number,
): Promise<Notebook> {
  for (const starter of starterTemplates()) {
    if ((starter.since ?? 1) <= seeded) continue
    await db.transaction('rw', [db.pages, db.blocks], async () => {
      const roots = (
        await db.pages.where('notebookId').equals(notebook.id).toArray()
      ).filter((p) => p.parentId === null)
      if (roots.some((p) => p.title === starter.title)) return
      // The daily page has a fixed id (sync L1) unless a deleted copy has it.
      const roleId = starter.role
        ? stableId(`${notebook.id}:template:${starter.role}`)
        : undefined
      const fixedId =
        roleId && !(await db.pages.get(roleId)) ? roleId : undefined
      const batch: StarterBatch = { pages: [], blocks: [] }
      const rootOrders = roots
        .filter(isLive)
        .sort(byOrder)
        .map((p) => p.order)
      await buildStarterPage(
        db,
        batch,
        notebook.id,
        null,
        rootOrders,
        starter,
        fixedId,
      )
      await db.pages.bulkAdd(batch.pages)
      await db.blocks.bulkAdd(batch.blocks)
    })
  }
  const changes = { starterVersion: STARTER_VERSION, updatedAt: Date.now() }
  await db.notebooks.update(notebook.id, changes)
  return { ...notebook, ...changes }
}

/**
 * Copies a page's blocks and its live sub-pages (any depth, keeping their
 * titles and tags) under a new page; the new page gets the source's tags
 * too. Links to pages inside the copied tree point at the copies; other
 * page links are left out. With `withCards`,
 * copied cards get a schedule. Pages made by this copy are never copied
 * again (the target may sit inside the source's own sub-pages).
 */
async function copyPageTree(
  db: LearningNotesDB,
  fromPageId: string,
  toPageId: string,
  withCards: boolean,
  made: Set<string> = new Set([toPageId]),
): Promise<void> {
  const from = (await getPage(db, fromPageId))!
  const to = (await getPage(db, toPageId))!
  if (from.tagIds?.length) {
    const tagIds = [...new Set([...(to.tagIds ?? []), ...from.tagIds])]
    await db.pages.update(to.id, { tagIds, updatedAt: Date.now() })
  }
  const copies = new Map<string, string>() // sub-page id → its copy
  for (const child of await listChildPages(db, from.notebookId, from.id)) {
    if (made.has(child.id)) continue
    const copy = await createPage(db, to.notebookId, to.id, child.title)
    made.add(copy.id)
    copies.set(child.id, copy.id)
  }

  // Links in text to this page or its sub-pages point at the copies (at the
  // page: the copied headings have new ids); other links are kept.
  copies.set(fromPageId, toPageId)
  const repoint = (link: NoteLinkProps): NoteLinkProps => {
    const target = copies.get(link.pageId)
    return target ? { ...link, pageId: target, blockId: '' } : link
  }
  await copyBlocks(db, fromPageId, toPageId, [], (block) => {
    if (block.type !== 'pageLink') {
      if (linkTargets(block).length === 0) return undefined
      return {
        ...block.content,
        text: mapNoteLinks(block.content.text, repoint)!,
      }
    }
    const target = copies.get(String(block.content.pageId))
    return target ? { ...block.content, pageId: target } : null
  })
  copies.delete(fromPageId)
  if (withCards) await syncCardRecords(db, toPageId)
  for (const [childId, copyId] of copies) {
    await copyPageTree(db, childId, copyId, withCards, made)
  }
}

/**
 * True once every starter template is written. While the background seeding
 * runs this is false, so lists that show templates wait instead of flashing
 * a short list (a missing Study row) that then jumps (perf-start).
 */
export async function startersReady(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<boolean> {
  const notebook = await findNotebookOfKind(db, workspaceId, 'templates')
  return !!notebook && (notebook.starterVersion ?? 1) >= STARTER_VERSION
}

/** Template pages of a workspace, in order. */
export async function listTemplates(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<Page[]> {
  const notebook = await findNotebookOfKind(db, workspaceId, 'templates')
  return notebook ? listChildPages(db, notebook.id, null) : []
}

/** A template with a short preview (its first few headings). */
export interface TemplateSummary {
  id: string
  title: string
  preview: string
  isDaily: boolean
}

export async function listTemplateSummaries(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<TemplateSummary[]> {
  const templates = await listTemplates(db, workspaceId)
  return Promise.all(
    templates.map(async (t) => {
      const headings = (await listBlocks(db, t.id))
        .filter((b) => b.type === 'heading' && b.parentId === null)
        .map((b) => toPlainText(b.content))
        .filter(Boolean)
      return {
        id: t.id,
        title: t.title,
        preview: headings.slice(0, 3).join(' · '),
        isDaily: t.templateRole === 'daily',
      }
    }),
  )
}

/** The template that fills new journal days (undefined if missing). */
export async function getDailyTemplate(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<Page | undefined> {
  return (await listTemplates(db, workspaceId)).find(
    (t) => t.templateRole === 'daily',
  )
}

/** Creates a page whose content (and sub-pages) are copied from a template. */
export async function createPageFromTemplate(
  db: LearningNotesDB,
  notebookId: string,
  parentId: string | null,
  templateId: string,
): Promise<Page> {
  return db.transaction(
    'rw',
    [db.notebooks, db.pages, db.blocks, db.cards],
    async () => {
      if (!(await getPage(db, templateId))) {
        throw new Error('Template not found')
      }
      const page = await createPage(db, notebookId, parentId)
      await copyPageTree(db, templateId, page.id, true) // cards get a schedule
      return page
    },
  )
}

/** The stored (English) title of the starter "Study" template (N2). */
const STUDY_TEMPLATE_TITLE = 'Study notes'

/**
 * The Study template of the new-page start: the starter "Study notes" page.
 * Undefined if the owner renamed or deleted it (then the Study row and
 * "Always start new pages as Study" simply do not show).
 */
export async function getStudyTemplate(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<Page | undefined> {
  return (await listTemplates(db, workspaceId)).find(
    (p) => p.title === STUDY_TEMPLATE_TITLE,
  )
}

/** True when a page has nothing written yet (no blocks, or only empty lines). */
export async function isPageBlank(
  db: LearningNotesDB,
  pageId: string,
): Promise<boolean> {
  return (await listBlocks(db, pageId)).every(
    (b) => b.type === 'paragraph' && toPlainText(b.content).trim() === '',
  )
}

/**
 * Fills a still-blank page from a template (N2). Returns false and changes
 * nothing if the page already has writing. Empty lines are soft-deleted
 * first; the template's blocks, cards and sub-pages are then copied in.
 */
export async function applyTemplateToPage(
  db: LearningNotesDB,
  pageId: string,
  templateId: string,
): Promise<boolean> {
  return db.transaction(
    'rw',
    [db.notebooks, db.pages, db.blocks, db.cards],
    async () => {
      if (!(await getPage(db, templateId))) {
        throw new Error('Template not found')
      }
      if (!(await isPageBlank(db, pageId))) return false
      const top = (await listBlocks(db, pageId)).filter(
        (b) => b.parentId === null,
      )
      for (const block of top) {
        await deleteBlock(db, block.id)
      }
      await copyPageTree(db, templateId, pageId, true)
      return true
    },
  )
}

/**
 * Saves a copy of a page as a new template (same title, blocks and
 * sub-pages; page links are left out). `title` names the template
 * (default: the page's title). Returns the new template.
 */
export async function saveAsTemplate(
  db: LearningNotesDB,
  workspaceId: string,
  pageId: string,
  title?: string,
): Promise<Page> {
  return db.transaction(
    'rw',
    [db.workspaces, db.notebooks, db.pages, db.blocks],
    async () => {
      const page = await getPage(db, pageId)
      if (!page) throw new Error('Page not found')
      const notebook = await ensureTemplates(db, workspaceId)
      const template = await createPage(
        db,
        notebook.id,
        null,
        title?.trim() || page.title || 'Untitled',
      )
      await copyPageTree(db, pageId, template.id, false)
      return template
    },
  )
}

/** Creates an empty template and returns it. */
export async function createTemplate(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<Page> {
  return db.transaction(
    'rw',
    [db.workspaces, db.notebooks, db.pages, db.blocks],
    async () => {
      const notebook = await ensureTemplates(db, workspaceId)
      return createPage(db, notebook.id, null)
    },
  )
}
