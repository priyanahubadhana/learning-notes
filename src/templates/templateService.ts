import { copyBlocks, createBlock, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { Notebook, Page } from '../core/types'
import { toPlainText } from '../editor/mapping'
import {
  createNotebook,
  findNotebookOfKind,
} from '../notebooks/notebookService'
import { createPage, getPage, listChildPages } from '../pages/pageService'
import { STARTER_TEMPLATES } from './starterTemplates'

/**
 * Templates are normal pages inside a special "Templates" notebook, so they
 * are edited like any page. Using a template copies its blocks.
 */

/** Block types never copied from/to templates (links point to one page). */
const NOT_COPIED = ['pageLink']

/**
 * Returns the Templates notebook, creating it (with the starter templates)
 * the first time.
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
      if (existing) return existing

      const notebook = await createNotebook(
        db,
        workspaceId,
        'Templates',
        'templates',
      )
      for (const starter of STARTER_TEMPLATES) {
        const page = await createPage(db, notebook.id, null, starter.title, {
          ...(starter.role && { templateRole: starter.role }),
        })
        for (const block of starter.blocks) {
          await createBlock(db, { pageId: page.id, ...block })
        }
      }
      return notebook
    },
  )
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

/** Creates a page whose content is copied from a template. */
export async function createPageFromTemplate(
  db: LearningNotesDB,
  notebookId: string,
  parentId: string | null,
  templateId: string,
): Promise<Page> {
  return db.transaction('rw', db.notebooks, db.pages, db.blocks, async () => {
    if (!(await getPage(db, templateId))) throw new Error('Template not found')
    const page = await createPage(db, notebookId, parentId)
    await copyBlocks(db, templateId, page.id, NOT_COPIED)
    return page
  })
}

/**
 * Saves a copy of a page as a new template (same title and blocks; page
 * links are left out). Returns the new template.
 */
export async function saveAsTemplate(
  db: LearningNotesDB,
  workspaceId: string,
  pageId: string,
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
        page.title || 'Untitled',
      )
      await copyBlocks(db, pageId, template.id, NOT_COPIED)
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
