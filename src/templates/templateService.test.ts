import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { plainText, toPlainText } from '../editor/mapping'
import { createNotebook, listNotebooks } from '../notebooks/notebookService'
import {
  createPage,
  deletePage,
  getPage,
  listChildPages,
} from '../pages/pageService'
import {
  createPageFromTemplate,
  ensureTemplates,
  getDailyTemplate,
  listTemplateSummaries,
  listTemplates,
  saveAsTemplate,
} from './templateService'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})

afterEach(async () => {
  await db.delete()
})

const texts = async (pageId: string) =>
  (await listBlocks(db, pageId)).map(
    (b) => `${b.type}:${toPlainText(b.content)}`,
  )

describe('templates', () => {
  it('creates the seven starter templates once, hidden from Notebooks', async () => {
    await ensureTemplates(db, ws)
    await ensureTemplates(db, ws)
    expect((await listTemplates(db, ws)).map((t) => t.title)).toEqual([
      'Daily journal',
      'Study notes',
      'Meeting notes',
      'Reading notes',
      'Project plan',
      'Lesson',
      'Lesson (large topic)',
    ])
    expect(await listNotebooks(db, ws)).toEqual([])
  })

  it('marks and protects the Daily journal template', async () => {
    await ensureTemplates(db, ws)
    const daily = await getDailyTemplate(db, ws)
    expect(daily?.title).toBe('Daily journal')
    await expect(deletePage(db, daily!.id)).rejects.toThrow('protected')

    // Other templates can be deleted.
    const study = (await listTemplates(db, ws))[1]
    await deletePage(db, study.id)
    expect(await listTemplates(db, ws)).toHaveLength(6)
  })

  it('summaries preview the first headings', async () => {
    await ensureTemplates(db, ws)
    const [daily] = await listTemplateSummaries(db, ws)
    expect(daily).toMatchObject({
      title: 'Daily journal',
      preview: 'Today I learned · What was hard · Review tomorrow',
      isDaily: true,
    })
  })

  it('new page from template copies the blocks with new ids', async () => {
    await ensureTemplates(db, ws)
    const nb = await createNotebook(db, ws, 'Notes')
    const study = (await listTemplates(db, ws))[1]

    const page = await createPageFromTemplate(db, nb.id, null, study.id)
    expect(page.title).toBe('')
    expect(await texts(page.id)).toEqual(await texts(study.id))

    const templateIds = (await listBlocks(db, study.id)).map((b) => b.id)
    for (const b of await listBlocks(db, page.id)) {
      expect(templateIds).not.toContain(b.id)
    }
  })

  it('keeps nesting when copying', async () => {
    const nb = await createNotebook(db, ws, 'Notes')
    const source = await createPage(db, nb.id, null, 'Nested')
    const parent = await createBlock(db, {
      pageId: source.id,
      type: 'bulletListItem',
      content: { text: plainText('parent') },
    })
    await createBlock(db, {
      pageId: source.id,
      type: 'bulletListItem',
      parentId: parent.id,
      content: { text: plainText('child') },
    })

    const template = await saveAsTemplate(db, ws, source.id)
    const copied = await listBlocks(db, template.id)
    const p = copied.find((b) => b.parentId === null)!
    const c = copied.find((b) => b.parentId !== null)!
    expect(toPlainText(p.content)).toBe('parent')
    expect(toPlainText(c.content)).toBe('child')
    expect(c.parentId).toBe(p.id)
  })

  it('save as template copies title and blocks, but not page links', async () => {
    const nb = await createNotebook(db, ws, 'Notes')
    const page = await createPage(db, nb.id, null, 'My method')
    await createBlock(db, {
      pageId: page.id,
      type: 'paragraph',
      content: { text: plainText('Step one') },
    })
    await createBlock(db, {
      pageId: page.id,
      type: 'pageLink',
      content: { pageId: 'x' },
    })

    const template = await saveAsTemplate(db, ws, page.id)
    expect(template.title).toBe('My method')
    const named = await saveAsTemplate(db, ws, page.id, '  Lab report  ')
    expect(named.title).toBe('Lab report')
    expect(await texts(template.id)).toEqual(['paragraph:Step one'])
    expect((await listTemplates(db, ws)).at(-1)?.id).toBe(named.id)
  })
})

describe('lesson templates', () => {
  const titles = async (notebookId: string, parentId: string) =>
    (await listChildPages(db, notebookId, parentId)).map((p) => p.title)
  const large = async () =>
    (await listTemplates(db, ws)).find(
      (t) => t.title === 'Lesson (large topic)',
    )!

  it('Lesson has the three sections and a live card list', async () => {
    await ensureTemplates(db, ws)
    const lesson = (await listTemplates(db, ws)).find(
      (t) => t.title === 'Lesson',
    )!
    expect(await texts(lesson.id)).toEqual([
      'heading:Detailed notes',
      'paragraph:',
      'heading:Keyword summary',
      'bulletListItem:',
      'heading:Flashcards',
      'cardList:',
    ])
  })

  it('Lesson (large topic) has three sub-pages; its list covers them', async () => {
    const nb = await ensureTemplates(db, ws)
    const tpl = await large()
    expect(await titles(nb.id, tpl.id)).toEqual([
      'Detailed notes',
      'Keyword summary',
      'Flashcards',
    ])
    const list = (await listBlocks(db, tpl.id)).find(
      (b) => b.type === 'cardList',
    )
    expect(list?.content).toEqual({ includeSubpages: true })
  })

  it('upgrade adds the new starters to old workspaces once', async () => {
    // An old workspace: Templates notebook with no starterVersion.
    const nb = await createNotebook(db, ws, 'Templates', 'templates')
    await createPage(db, nb.id, null, 'My own template')

    await ensureTemplates(db, ws)
    await ensureTemplates(db, ws) // second run adds nothing
    expect((await listTemplates(db, ws)).map((t) => t.title)).toEqual([
      'My own template',
      'Lesson',
      'Lesson (large topic)',
    ])

    // A deleted starter does not come back.
    await deletePage(db, (await listTemplates(db, ws))[1].id)
    await ensureTemplates(db, ws)
    expect(await listTemplates(db, ws)).toHaveLength(2)
  })

  it('new page from template copies sub-pages with their titles', async () => {
    await ensureTemplates(db, ws)
    const nb = await createNotebook(db, ws, 'Biology')
    const page = await createPageFromTemplate(
      db,
      nb.id,
      null,
      (await large()).id,
    )
    expect(page.title).toBe('')
    expect(await titles(nb.id, page.id)).toEqual([
      'Detailed notes',
      'Keyword summary',
      'Flashcards',
    ])
    // The links on the new page open the new sub-pages, not the template's.
    const subIds = (await listChildPages(db, nb.id, page.id)).map((p) => p.id)
    const linked = (await listBlocks(db, page.id))
      .filter((b) => b.type === 'pageLink')
      .map((b) => b.content.pageId)
    expect(linked).toEqual(subIds)
    const flash = (await listChildPages(db, nb.id, page.id))[2]
    expect(await texts(flash.id)).toEqual(['cardList:'])
  })

  it('copying a template into its own sub-page stops (no endless copy)', async () => {
    const nb = await ensureTemplates(db, ws)
    const tpl = await large()
    const sub = (await listChildPages(db, nb.id, tpl.id))[0]
    const page = await createPageFromTemplate(db, nb.id, sub.id, tpl.id)
    expect(await titles(nb.id, page.id)).toEqual([
      'Detailed notes',
      'Keyword summary',
      'Flashcards',
    ])
    expect(await titles(nb.id, sub.id)).toEqual([''])
  })

  it('save as template keeps sub-pages', async () => {
    const nb = await createNotebook(db, ws, 'Notes')
    const page = await createPage(db, nb.id, null, 'Course')
    await createPage(db, nb.id, page.id, 'Week 1')
    const template = await saveAsTemplate(db, ws, page.id)
    const tplNb = (await getPage(db, template.id))!.notebookId
    expect(await titles(tplNb, template.id)).toEqual(['Week 1'])
  })
})

describe('template links', () => {
  it('large-topic template links to its own sub-pages', async () => {
    const nb = await ensureTemplates(db, ws)
    const tpl = (await listTemplates(db, ws)).at(-1)!
    const subIds = (await listChildPages(db, nb.id, tpl.id)).map((p) => p.id)
    const linked = (await listBlocks(db, tpl.id))
      .filter((b) => b.type === 'pageLink')
      .map((b) => b.content.pageId)
    expect(linked).toEqual(subIds)
  })

  it('links to pages outside the copied tree are left out', async () => {
    const nb = await createNotebook(db, ws, 'Notes')
    const other = await createPage(db, nb.id, null, 'Other')
    const page = await createPage(db, nb.id, null, 'Source')
    await createBlock(db, {
      pageId: page.id,
      type: 'pageLink',
      content: { pageId: other.id },
    })
    const template = await saveAsTemplate(db, ws, page.id)
    expect(await texts(template.id)).toEqual([])
  })
})
