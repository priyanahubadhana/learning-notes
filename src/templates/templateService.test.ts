import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { plainText, toPlainText } from '../editor/mapping'
import { createNotebook, listNotebooks } from '../notebooks/notebookService'
import { createPage, deletePage } from '../pages/pageService'
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
  it('creates the five starter templates once, hidden from Notebooks', async () => {
    await ensureTemplates(db, ws)
    await ensureTemplates(db, ws)
    expect((await listTemplates(db, ws)).map((t) => t.title)).toEqual([
      'Daily journal',
      'Study notes',
      'Meeting notes',
      'Reading notes',
      'Project plan',
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
    expect(await listTemplates(db, ws)).toHaveLength(4)
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
    expect(await texts(template.id)).toEqual(['paragraph:Step one'])
    expect((await listTemplates(db, ws)).at(-1)?.id).toBe(template.id)
  })
})
