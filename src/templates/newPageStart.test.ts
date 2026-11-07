import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { plainText, toPlainText } from '../editor/mapping'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { newPageStudySetting } from '../settings/builtinSettings'
import { getSetting, setSetting } from '../settings/settingsService'
import {
  applyTemplateToPage,
  ensureTemplates,
  getStudyTemplate,
  isPageBlank,
} from './templateService'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
  await ensureTemplates(db, ws)
})

afterEach(async () => {
  await db.delete()
})

const newPage = async () => {
  const nb = await createNotebook(db, ws, 'Book')
  return createPage(db, nb.id, null)
}

describe('new-page start (N2)', () => {
  it('finds the Study template, and nothing if it was renamed', async () => {
    const study = await getStudyTemplate(db, ws)
    expect(study?.title).toBe('Study notes')
    await db.pages.update(study!.id, { title: 'My own' })
    expect(await getStudyTemplate(db, ws)).toBeUndefined()
  })

  it('a page with no blocks or only empty lines is blank', async () => {
    const page = await newPage()
    expect(await isPageBlank(db, page.id)).toBe(true)
    await createBlock(db, {
      pageId: page.id,
      type: 'paragraph',
      content: { text: plainText('') },
    })
    expect(await isPageBlank(db, page.id)).toBe(true)
    await createBlock(db, {
      pageId: page.id,
      type: 'paragraph',
      content: { text: plainText('hello') },
    })
    expect(await isPageBlank(db, page.id)).toBe(false)
  })

  it('fills a blank page from a template and drops the empty line', async () => {
    const page = await newPage()
    await createBlock(db, {
      pageId: page.id,
      type: 'paragraph',
      content: { text: plainText('') },
    })
    const study = (await getStudyTemplate(db, ws))!
    expect(await applyTemplateToPage(db, page.id, study.id)).toBe(true)
    const blocks = await listBlocks(db, page.id)
    expect(blocks[0].type).toBe('heading')
    expect(toPlainText(blocks[0].content)).toBe('Topic')
    expect(blocks.some((b) => b.type === 'paragraph' && b.order)).toBe(true)
    // The template itself is untouched.
    expect((await listBlocks(db, study.id)).length).toBe(blocks.length)
  })

  it('does nothing to a page that already has writing', async () => {
    const page = await newPage()
    await createBlock(db, {
      pageId: page.id,
      type: 'paragraph',
      content: { text: plainText('mine') },
    })
    const study = (await getStudyTemplate(db, ws))!
    expect(await applyTemplateToPage(db, page.id, study.id)).toBe(false)
    expect((await listBlocks(db, page.id)).length).toBe(1)
  })

  it('the Always-Study setting is off at first and saved when turned on', async () => {
    expect(await getSetting(db, newPageStudySetting)).toBe('off')
    await setSetting(db, newPageStudySetting, 'on')
    expect(await getSetting(db, newPageStudySetting)).toBe('on')
  })
})
