import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listBlocks } from '../../core/blockService'
import type { LearningNotesDB } from '../../core/db'
import { createTestDb } from '../../core/testing'
import type { Page } from '../../core/types'
import { getOrCreateDefaultWorkspace } from '../../core/workspaceService'
import { listRecordings } from '../../audio/recordingService'
import { listRows } from '../../databases/databaseService'
import { createNotebook } from '../../notebooks/notebookService'
import { createPage } from '../../pages/pageService'
import {
  NLM_INFOGRAPHIC_PROMPT,
  NLM_MINDMAP_PROMPT,
  NLM_QUIZ_PROMPT,
} from '../../prompts/seedPrompts'
import {
  importAudio,
  importCards,
  importMindMap,
  importReport,
  importSlides,
  importTable,
  importVideo,
  resolveTarget,
  undoImport,
} from './run'
import { parseQuizText, parseTable } from './parse'

let db: LearningNotesDB
let ws: string
let page: Page
beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
  const nb = await createNotebook(db, ws, 'NB')
  page = await createPage(db, nb.id, null, 'P')
})
afterEach(async () => {
  await db.delete()
})

const file = (name: string, type: string, bytes = 8) =>
  new File([new Uint8Array(bytes).fill(1)], name, { type })

describe('importing from NotebookLM', () => {
  it('keeps an audio overview as a recording and Undo removes it', async () => {
    const made = await importAudio(
      db,
      page,
      file('o.m4a', 'audio/mp4'),
      5000,
      false,
    )
    expect(await listRecordings(db, page.id)).toHaveLength(1)
    await undoImport(db, made)
    expect(await listRecordings(db, page.id)).toHaveLength(0)
  })

  it('keeps a video as a file block', async () => {
    const made = await importVideo(db, page, file('v.mp4', 'video/mp4'), false)
    const blocks = await listBlocks(db, page.id)
    expect(blocks.map((b) => b.type)).toEqual(['file'])
    const row = await db.bookFiles.get(made.fileIds[0])
    expect(row?.mime).toBe('video/mp4')
    await undoImport(db, made)
    expect(await listBlocks(db, page.id)).toHaveLength(0)
  })

  it('flags a slide deck for the Slides tab', async () => {
    const made = await importSlides(db, page, file('d.pptx', ''), false)
    expect((await db.bookFiles.get(made.fileIds[0]))?.slides).toBe(true)
  })

  it('makes cards from the quiz prompt answer shape', async () => {
    expect(NLM_QUIZ_PROMPT).toContain('Q: ')
    const cards = parseQuizText(
      'Q: Which is largest? (a) Sun (b) Moon\nA: (a) Sun\n\nQ: Two\nA: 2',
    )
    expect(cards).toHaveLength(2)
    const made = await importCards(db, page, cards, false)
    const blocks = await listBlocks(db, page.id)
    expect(blocks.filter((b) => b.type === 'card')).toHaveLength(2)
    expect(await db.cards.where('pageId').equals(page.id).count()).toBe(2)
    await undoImport(db, made)
    expect(
      (await listBlocks(db, page.id)).filter((b) => b.type === 'card'),
    ).toHaveLength(0)
  })

  it('reads the mind map prompt answer shape', async () => {
    expect(NLM_MINDMAP_PROMPT).toContain('indented')
    const made = await importMindMap(
      db,
      page,
      '- Cells\n  - Nucleus\n    - DNA\n  - Membrane',
      false,
    )
    const [block] = await listBlocks(db, page.id)
    expect(block.type).toBe('mindMap')
    expect(made.count).toBe(4)
  })

  it('reads the infographic prompt answer shape as headings and bullets', async () => {
    expect(NLM_INFOGRAPHIC_PROMPT).toContain('## Heading')
    await importReport(
      db,
      page,
      '# Water\n\n## Uses\n- Drinking\n- Farming\n\n## Facts\n- 71% of Earth',
      false,
    )
    const types = (await listBlocks(db, page.id)).map((b) => b.type)
    expect(types).toContain('heading')
    expect(types).toContain('bulletListItem')
  })

  it('makes a database from a table and Undo removes it', async () => {
    const t = parseTable('Name\tScore\nA\t3\nB\t5')
    const made = await importTable(
      db,
      ws,
      page,
      t.headers,
      t.body,
      'Scores',
      false,
    )
    expect(await listRows(db, made.databaseIds[0])).toHaveLength(2)
    expect((await listBlocks(db, page.id))[0].type).toBe('database')
    await undoImport(db, made)
    expect(
      (await db.databases.get(made.databaseIds[0]))?.deletedAt,
    ).not.toBeNull()
  })

  it('makes a new page when asked', async () => {
    const r = await resolveTarget(db, {
      notebookId: page.notebookId,
      pageId: null,
      title: 'From NotebookLM',
    })
    expect(r.newPage).toBe(true)
    expect(r.page.title).toBe('From NotebookLM')
  })
})
