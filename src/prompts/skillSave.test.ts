import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { listRows } from '../databases/databaseService'
import { parseMindMap } from '../editor/mindMap/model'
import { toPlainText as plainText } from '../editor/mapping'
import { createNotebook, listNotebooks } from '../notebooks/notebookService'
import { listPages } from '../pages/pageService'
import { NOTHING_OFF, choose, type Sections } from './skillChoose'
import { parseSkillAnswer } from './skillFormat'
import { buildCards, saveSkillResult, undoSave } from './skillSave'

const answer = {
  title: 'Cells',
  summary: 'Cells make energy.',
  keywords: ['cell', 'energy'],
  sources: [{ n: 1, title: 'The lecture', url: 'https://example.org/a' }],
  points: [
    {
      text: 'Mitochondria make ATP',
      stars: 10,
      icon: '🔋',
      topic: 'Energy',
      sources: [1],
    },
    { text: 'Cells are small', stars: 5, topic: 'Size', sources: [] },
    { text: 'Fun fact', stars: 1 },
    {
      text: 'Nucleus holds DNA',
      stars: 9,
      icon: '🧬',
      topic: 'Energy',
      sources: [1],
    },
  ],
  pages: [{ title: 'Energy', body: 'ATP is made in mitochondria [1].' }],
  cards: [
    { kind: 'qa', q: 'What makes ATP?', a: 'Mitochondria', point: 0 },
    { kind: 'cloze', q: 'Cells make {{energy}}' },
    { kind: 'reverse', q: 'ATP', a: 'Energy molecule' },
  ],
}
const ALL: Sections = {
  summary: true,
  keywords: true,
  mindMap: true,
  rows: true,
  pages: true,
  cards: true,
  sources: true,
}

/** The notebook's note pages (database rows are pages too). */
const notes = async (db: LearningNotesDB, id: string) =>
  (await listPages(db, id)).filter((p) => !p.databaseId)

let db: LearningNotesDB
let ws: string
beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})
afterEach(async () => {
  await db.delete()
})

describe('saving a skill result', () => {
  it('makes an overview page with mind map and database, detail pages and cards, marked AI, in a new notebook', async () => {
    const result = parseSkillAnswer(JSON.stringify(answer))
    const saved = await saveSkillResult(
      db,
      ws,
      choose(result, NOTHING_OFF, ALL),
      { kind: 'new', title: 'Research book' },
    )
    expect(saved.newNotebook).toBe(true)
    const nb = (await listNotebooks(db, ws)).find(
      (n) => n.id === saved.notebookId,
    )
    expect(nb?.title).toBe('Research book')
    const pages = await notes(db, saved.notebookId)
    expect(pages.map((p) => p.title)).toEqual(
      expect.arrayContaining(['Cells', 'Energy']),
    )
    expect(pages).toHaveLength(3) // overview, Energy, Cards

    const overview = await listBlocks(db, saved.firstPageId)
    const text = overview.map((b) => plainText(b.content)).join('\n')
    expect(text).toContain('Cells make energy.')
    // Must-know points carry their icon; the unsourced one says so.
    expect(text).toContain('🔋 Mitochondria make ATP')
    expect(text).toMatch(/Cells are small.*unchecked/)
    expect(text).toContain('[1] The lecture')
    expect(
      overview.every((b) => b.source === 'ai' && b.batchId === saved.batchId),
    ).toBe(true)

    const map = overview.find((b) => b.type === 'mindMap')!
    const nodes = parseMindMap(map.content.data).nodes.map((n) => n.text)
    expect(nodes).toContain('🔋 Mitochondria make ATP')
    expect(nodes).toContain('Energy')

    expect(overview.some((b) => b.type === 'database')).toBe(true)
    const rows = await listRows(db, saved.databaseId!)
    expect(rows.map((r) => r.title)).toEqual([
      'Mitochondria make ATP',
      'Nucleus holds DNA',
      'Cells are small',
      'Fun fact',
    ])

    // Cards: qa, cloze, both ways (2), plus one for the Must point with none.
    const cardsPage = pages.find((p) => p.title.startsWith('Cards'))!
    const cardBlocks = (await listBlocks(db, cardsPage.id)).filter(
      (b) => b.type === 'card',
    )
    expect(cardBlocks.length).toBe(4)
    expect(buildCards(result).some((c) => c.kind === 'cloze')).toBe(true)
    expect(
      await db.cards.where('pageId').equals(cardsPage.id).count(),
    ).toBeGreaterThan(3)
  })

  it('Undo removes a new notebook, or just the pages made in an old one', async () => {
    const result = parseSkillAnswer(JSON.stringify(answer))
    const chosen = choose(result, NOTHING_OFF, ALL)
    const fresh = await saveSkillResult(db, ws, chosen, {
      kind: 'new',
      title: 'R',
    })
    await undoSave(db, fresh)
    expect(
      (await listNotebooks(db, ws)).some((n) => n.id === fresh.notebookId),
    ).toBe(false)

    const old = await createNotebook(db, ws, 'Mine')
    const saved = await saveSkillResult(db, ws, chosen, {
      kind: 'existing',
      notebookId: old.id,
    })
    expect(await notes(db, old.id)).toHaveLength(3)
    await undoSave(db, saved)
    expect(await notes(db, old.id)).toHaveLength(0)
    expect((await listNotebooks(db, ws)).some((n) => n.id === old.id)).toBe(
      true,
    )
  })

  it('leaves out what was unticked: points, cards, sections and sources', async () => {
    const result = parseSkillAnswer(JSON.stringify(answer))
    const chosen = choose(
      result,
      {
        ...NOTHING_OFF,
        points: new Set([2]),
        cards: new Set([1]),
        sources: new Set([0]),
      },
      { ...ALL, summary: false, pages: false, mindMap: false },
    )
    expect(chosen.result.points).toHaveLength(3)
    expect(chosen.result.cards).toHaveLength(2)
    // The source is gone, so points that cited it are unchecked.
    expect(chosen.result.sources).toEqual([])
    expect(chosen.result.points.every((p) => !p.checked)).toBe(true)
    // Card 0 still tests point 0 after renumbering.
    expect(chosen.result.cards[0].point).toBe(0)
    const saved = await saveSkillResult(db, ws, chosen, {
      kind: 'new',
      title: 'R',
    })
    const overview = await listBlocks(db, saved.firstPageId)
    const text = overview.map((b) => plainText(b.content)).join('\n')
    expect(text).not.toContain('Cells make energy.')
    expect(overview.some((b) => b.type === 'mindMap')).toBe(false)
    expect(await notes(db, saved.notebookId)).toHaveLength(2) // overview + Cards
  })

  it('removes everything again if saving fails half-way', async () => {
    const result = parseSkillAnswer(JSON.stringify(answer))
    await expect(
      saveSkillResult(db, ws, choose(result, NOTHING_OFF, ALL), {
        kind: 'existing',
        notebookId: 'missing',
      }),
    ).rejects.toThrow()
    expect(await db.pages.count()).toBe(0)
  })
})
