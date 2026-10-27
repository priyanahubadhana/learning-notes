import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createBlock } from '../core/blockService'
import { createTestDb } from '../core/testing'
import type { Card } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import {
  addColumn,
  addRelationColumn,
  addRow,
  createDatabase,
  ensureStudyTracker,
  listColumns,
  setCell,
} from '../databases/databaseService'
import { studyTrackerId } from '../databases/notebookTabs'
import { setLessonStatus } from '../databases/trackerService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { MAIN_PART, newCard } from '../recall/cardService'
import { searchIndex } from '../search/searchService'
import { addPageTag } from '../tags/tagService'
import { findOrCreateTagPath } from '../tags/tagService'
import {
  BundleError,
  bundleFile,
  bundleFromSnapshot,
  exportNotebookBundle,
  readBundle,
} from './bundle'
import { importBundle } from './importBundle'
import { remapJson } from './remapJson'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})

afterEach(async () => {
  await db.delete()
})

describe('remapJson', () => {
  it('drops __proto__ keys from files', () => {
    const evil = JSON.parse('{"a":{"__proto__":{"polluted":true}},"b":1}')
    const out = remapJson(evil, new Map())
    expect(out).toEqual({ a: {}, b: 1 })
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('replaces ids in values and in keys, leaving other text alone', () => {
    const ids = new Map([
      ['old-1', 'new-1'],
      ['old-2', 'new-2'],
    ])
    expect(
      remapJson({ 'old-1': ['old-2', 'plain', 3], keep: { id: 'old-1' } }, ids),
    ).toEqual({ 'new-1': ['new-2', 'plain', 3], keep: { id: 'new-1' } })
  })
})

/** A notebook with notes, a card with a schedule, a tag, a link, databases and a tracker status. */
async function build() {
  const nb = (await createNotebook(db, ws, 'Cardiology')).id
  const a = await createPage(db, nb, null, 'Heart')
  const b = await createPage(db, nb, a.id, 'Valves')
  await createBlock(db, {
    pageId: b.id,
    type: 'paragraph',
    content: {
      text: [
        { type: 'text', text: 'See ', styles: {} },
        {
          type: 'noteLink',
          props: { pageId: a.id, blockId: '', label: 'Heart' },
        },
      ],
    },
  })
  const question = await createBlock(db, {
    pageId: a.id,
    type: 'card',
    content: {
      text: [{ type: 'text', text: 'Which valves close in S1?', styles: {} }],
    },
  })
  const card: Card = {
    ...newCard(question, nb, MAIN_PART, 1000),
    id: 'card-1',
    reps: 3,
    intervalDays: 12,
    due: 5000,
    lastReviewAt: 4000,
    lastRating: 'good',
  }
  await db.cards.add(card)
  await db.reviewLogs.add({
    id: 'log-1',
    cardId: card.id,
    rating: 'good',
    createdAt: 4000,
    durationMs: 800,
    kind: 'review',
    scheduler: 'fixed',
    dueBefore: 1000,
    dueAfter: 5000,
    intervalBefore: 5,
    intervalAfter: 12,
    stepAfter: 3,
    isNew: false,
  })
  const tag = await findOrCreateTagPath(db, 'medicine/cardiology')
  await addPageTag(db, a.id, tag.id)

  const drugs = await createDatabase(db, ws, nb, 'Drugs')
  const classes = await createDatabase(db, ws, nb, 'Classes')
  const relation = await addRelationColumn(db, drugs.id, {
    name: 'Class',
    targetDatabaseId: classes.id,
  })
  const dose = await addColumn(db, drugs.id, { name: 'Dose', type: 'text' })
  const beta = await addRow(db, classes.id, { title: 'Beta blocker' })
  const atenolol = await addRow(db, drugs.id, { title: 'Atenolol' })
  await setCell(db, atenolol.id, relation.id, [beta.id])
  await setCell(db, atenolol.id, dose.id, '50 mg')

  const tracker = await ensureStudyTracker(db, nb)
  await setLessonStatus(db, a.id, 'mastered')
  return { nb, a, b, tag, drugs, classes, tracker }
}

describe('notebook file', () => {
  it('exports a notebook and imports it as an independent copy', async () => {
    const { nb, a, b, tag, tracker } = await build()
    const before = {
      pages: await db.pages.count(),
      cards: await db.cards.count(),
      tags: await db.tags.count(),
    }

    const file = bundleFile(await exportNotebookBundle(db, nb))
    const bundle = readBundle(await file.text())
    expect(bundle.kind).toBe('notebook')
    expect(bundle.tags.map((x) => x.path)).toEqual(['medicine/cardiology'])

    const summary = await importBundle(db, ws, bundle)
    expect(summary).toMatchObject({ notebooks: 1, cards: 1, databases: 3 })

    // New copies next to the originals; nothing was changed or lost.
    expect(await db.pages.count()).toBe(before.pages * 2 + 0)
    expect(await db.cards.count()).toBe(before.cards * 2)
    expect(await db.tags.count()).toBe(before.tags) // the tag is reused
    const copy = (await db.notebooks.toArray()).find(
      (n) => n.title === 'Cardiology (imported)',
    )!
    expect(copy.id).not.toBe(nb)
    expect(copy.tabs?.find((t) => t.kind === 'database')?.databaseId).toBe(
      studyTrackerId(copy.id),
    )
    const pages = await db.pages.where('notebookId').equals(copy.id).toArray()
    const copyA = pages.find((p) => p.title === 'Heart')!
    const copyB = pages.find((p) => p.title === 'Valves')!
    expect(copyA.id).not.toBe(a.id)
    expect(copyB.parentId).toBe(copyA.id)
    expect(copyA.tagIds).toEqual([tag.id])

    // The link inside the copy points at the copy of its page.
    const linkBlock = (
      await db.blocks.where('pageId').equals(copyB.id).toArray()
    )[0]
    expect(JSON.stringify(linkBlock.content)).toContain(copyA.id)
    expect(JSON.stringify(linkBlock.content)).not.toContain(a.id)
    expect(linkBlock.id).not.toBe(
      (await db.blocks.where('pageId').equals(b.id).toArray())[0].id,
    )

    // The card keeps its schedule and history, on the copy's page.
    const copyCard = (
      await db.cards.where('pageId').equals(copyA.id).toArray()
    )[0]
    expect(copyCard).toMatchObject({
      reps: 3,
      intervalDays: 12,
      due: 5000,
      lastRating: 'good',
      notebookId: copy.id,
    })
    expect(copyCard.id).not.toBe('card-1')
    expect(
      await db.reviewLogs.where('cardId').equals(copyCard.id).count(),
    ).toBe(1)

    // Databases: relation rows point at the copies, the tracker status is kept.
    const copyDatabases = await db.databases
      .where('notebookId')
      .equals(copy.id)
      .toArray()
    expect(copyDatabases.map((d) => d.id)).toContain(studyTrackerId(copy.id))
    const copyDrugs = copyDatabases.find((d) => d.title === 'Drugs')!
    const copyColumns = await listColumns(db, copyDrugs.id)
    const relation = copyColumns.find((c) => c.type === 'relation')!
    const copyClasses = copyDatabases.find((d) => d.title === 'Classes')!
    expect(relation.config.databaseId).toBe(copyClasses.id)
    const row = (
      await db.pages.where('databaseId').equals(copyDrugs.id).toArray()
    )[0]
    const target = (
      await db.pages.where('databaseId').equals(copyClasses.id).toArray()
    )[0]
    expect(row.values?.[relation.id]).toEqual([target.id])
    expect(await db.rowRefs.where('fromPageId').equals(row.id).count()).toBe(1)
    const status = (await listColumns(db, studyTrackerId(copy.id))).find(
      (c) => c.type === 'trackerStatus',
    )!
    expect(copyA.values?.[status.id]).toBe('mastered')
    expect(tracker.id).toBe(studyTrackerId(nb)) // the original is untouched
    // Imported notes are found by search.
    expect((await searchIndex(db, 'valves')).matches.length).toBeGreaterThan(1)

    // Importing again only adds more copies.
    await importBundle(db, ws, bundle)
    expect(await db.pages.count()).toBe(before.pages * 3)
  })

  it('refuses files that are not (or not safely) a Learning Notes file', () => {
    expect(() => readBundle('not json')).toThrow(BundleError)
    expect(() => readBundle('{"app":"other"}')).toThrow(/not a Learning Notes/)
    expect(() =>
      readBundle(
        '{"app":"learning-notes","kind":"notebook","formatVersion":99}',
      ),
    ).toThrow(/newer version/)
    expect(() =>
      readBundle(
        '{"app":"learning-notes","kind":"notebook","formatVersion":1,"pages":[{"title":"x"}]}',
      ),
    ).toThrow(/damaged/)
    expect(() =>
      readBundle(
        '{"app":"learning-notes","kind":"notebook","formatVersion":1,"pages":{}}',
      ),
    ).toThrow(/damaged/)
    expect(
      readBundle('{"app":"learning-notes","kind":"notebook","formatVersion":1}')
        .pages,
    ).toEqual([])
  })

  it('only normal notebooks can be exported', async () => {
    const journal = await createNotebook(db, ws, 'Journal', 'journal')
    await expect(exportNotebookBundle(db, journal.id)).rejects.toThrow()
  })

  it('turns a backup into a bundle of its normal notebooks and loose databases', () => {
    const base = { createdAt: 1, updatedAt: 1, deletedAt: null }
    const bundle = bundleFromSnapshot({
      app: 'learning-notes',
      dbName: 'learning-notes',
      version: 7,
      createdAt: 99,
      tables: {
        notebooks: [
          { ...base, id: 'n1', workspaceId: 'w', title: 'A', order: 'a0' },
          {
            ...base,
            id: 'n2',
            workspaceId: 'w',
            title: 'Journal',
            order: 'a1',
            kind: 'journal',
          },
        ],
        pages: [
          {
            ...base,
            id: 'p1',
            notebookId: 'n1',
            parentId: null,
            title: 'P',
            order: 'a0',
          },
          {
            ...base,
            id: 'p2',
            notebookId: 'n2',
            parentId: null,
            title: 'Day',
            order: 'a0',
          },
          {
            ...base,
            id: 'p3',
            notebookId: 'n1',
            parentId: null,
            title: 'Gone',
            order: 'a1',
            deletedAt: 5,
          },
        ],
        blocks: [
          {
            ...base,
            id: 'b1',
            pageId: 'p1',
            parentId: null,
            type: 'paragraph',
            content: {},
            order: 'a0',
          },
          {
            ...base,
            id: 'b2',
            pageId: 'p2',
            parentId: null,
            type: 'paragraph',
            content: {},
            order: 'a0',
          },
        ],
      },
    })
    expect(bundle.kind).toBe('backup')
    expect(bundle.notebooks.map((n) => n.id)).toEqual(['n1'])
    expect(bundle.pages.map((p) => p.id)).toEqual(['p1'])
    expect(bundle.blocks.map((b) => b.id)).toEqual(['b1'])
  })

  it('exports and imports a big notebook (500 pages, 10,000 notes, 5,000 cards) quickly', async () => {
    const nb = (await createNotebook(db, ws, 'Big')).id
    const stamp = { createdAt: 0, updatedAt: 0, deletedAt: null }
    const pages = Array.from({ length: 500 }, (_, i) => ({
      ...stamp,
      id: `pg${i}`,
      notebookId: nb,
      parentId: null,
      title: `Page ${i}`,
      order: `a${String(i).padStart(4, '0')}`,
    }))
    await db.pages.bulkAdd(pages)
    const blocks = Array.from({ length: 10_000 }, (_, i) => ({
      ...stamp,
      id: `bl${i}`,
      pageId: `pg${i % 500}`,
      parentId: null,
      type: i % 2 === 0 ? 'card' : 'paragraph',
      content: { text: [{ type: 'text', text: `Line ${i}`, styles: {} }] },
      order: `a${String(i).padStart(5, '0')}`,
    }))
    await db.blocks.bulkAdd(blocks)
    await db.cards.bulkAdd(
      blocks
        .filter((b) => b.type === 'card')
        .map((b) => ({
          ...newCard(b, nb, MAIN_PART, 0),
          id: `cd${b.id}`,
        })),
    )
    const start = performance.now()
    const bundle = readBundle(
      await bundleFile(await exportNotebookBundle(db, nb)).text(),
    )
    const summary = await importBundle(db, ws, bundle)
    const ms = performance.now() - start
    expect(summary).toMatchObject({ pages: 500, cards: 5000 })
    expect(await db.blocks.count()).toBe(20_000)
    expect(ms).toBeLessThan(30_000) // fake-indexeddb is far slower than a browser
  }, 90_000)
})
