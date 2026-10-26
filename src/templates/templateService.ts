import { copyBlocks, createBlock, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { Notebook, Page } from '../core/types'
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

/** Creates one starter page (and its sub-pages) from its definition. */
async function addStarterPage(
  db: LearningNotesDB,
  notebookId: string,
  parentId: string | null,
  starter: StarterPage & { role?: 'daily'; children?: StarterPage[] },
): Promise<string> {
  const page = await createPage(db, notebookId, parentId, starter.title, {
    ...(starter.role && { templateRole: starter.role }),
  })
  const childIds: string[] = []
  for (const child of starter.children ?? []) {
    childIds.push(await addStarterPage(db, notebookId, page.id, child))
  }
  for (const block of starter.blocks) {
    // A link to "child N" (see childLink) points at that sub-page's id.
    const { childIndex } = block.content
    const content =
      typeof childIndex === 'number'
        ? { pageId: childIds[childIndex] }
        : block.content
    await createBlock(db, { pageId: page.id, type: block.type, content })
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
  return db.transaction(
    'rw',
    [db.workspaces, db.notebooks, db.pages, db.blocks],
    async () => {
      const existing = await findNotebookOfKind(db, workspaceId, 'templates')
      const seeded = existing ? (existing.starterVersion ?? 1) : 0
      if (existing && seeded >= STARTER_VERSION) return existing

      const notebook =
        existing ??
        (await createNotebook(db, workspaceId, 'Templates', 'templates'))
      for (const starter of starterTemplates()) {
        if ((starter.since ?? 1) > seeded) {
          await addStarterPage(db, notebook.id, null, starter)
        }
      }
      const changes = { starterVersion: STARTER_VERSION, updatedAt: Date.now() }
      await db.notebooks.update(notebook.id, changes)
      return { ...notebook, ...changes }
    },
  )
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
