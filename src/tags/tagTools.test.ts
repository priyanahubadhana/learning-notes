import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { Block, JsonValue } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { inlineTagIds, TAG, toPlainText } from '../editor/mapping'
import { createNotebook } from '../notebooks/notebookService'
import { createPage, deletePage } from '../pages/pageService'
import { syncCardRecords } from '../recall/cardService'
import {
  createSavedSearch,
  getSavedSearch,
  readSavedQuery,
} from '../search/savedSearchService'
import {
  countTagged,
  DEFAULT_FILTERS,
  describeHits,
  runSearch,
} from '../search/searchQuery'
import {
  addPageTag,
  findOrCreateTagPath,
  tagMap,
  tagPathName,
} from './tagService'
import {
  deleteTag,
  mergeTag,
  moveTag,
  renameTag,
  setTagColor,
} from './tagTools'

let db: LearningNotesDB
let nb: string

beforeEach(async () => {
  db = createTestDb()
  const ws = (await getOrCreateDefaultWorkspace(db)).id
  nb = (await createNotebook(db, ws, 'Cardiology')).id
})

afterEach(async () => {
  await db.delete()
})

const text = (t: string): JsonValue => ({ type: 'text', text: t, styles: {} })
const tagRun = (tagId: string): JsonValue => ({
  type: TAG,
  props: { tagId, label: '' },
  content: [],
})
const block = (pageId: string, runs: JsonValue[], type = 'paragraph') =>
  createBlock(db, { pageId, type, parentId: null, content: { text: runs } })
const path = async (id: string) => tagPathName(await tagMap(db), id)
const tag = (p: string) => findOrCreateTagPath(db, p)
const reread = async (b: Block) => (await db.blocks.get(b.id))!

describe('rename, move, colour', () => {
  it('renames one level; a same-named neighbour is refused', async () => {
    const cardio = await tag('medicine/cardio')
    await tag('medicine/neuro')
    expect(await renameTag(db, cardio.id, 'Heart  sounds')).toBe('done')
    expect(await path(cardio.id)).toBe('medicine/Heart-sounds')
    expect(await renameTag(db, cardio.id, 'NEURO')).toBe('taken')
    expect(await renameTag(db, cardio.id, '#/ ')).toBe('empty')
    // Changing only the case of its own name is fine.
    expect(await renameTag(db, cardio.id, 'heart-SOUNDS')).toBe('done')
  })

  it('moves with sub-tags; never under itself or next to a twin', async () => {
    const cardio = await tag('medicine/cardio/valves')
    const valves = cardio
    const mid = cardio.parentId!
    expect(await moveTag(db, mid, valves.id)).toBe('loop')
    expect(await moveTag(db, mid, mid)).toBe('loop')
    expect(await moveTag(db, mid, null)).toBe('done')
    expect(await path(valves.id)).toBe('cardio/valves')
    await tag('exam/cardio')
    const exam = (await tag('exam')).id
    expect(await moveTag(db, mid, exam)).toBe('taken')
  })

  it('sets and clears a colour', async () => {
    const exam = await tag('exam')
    await setTagColor(db, exam.id, '#2f6feb')
    expect((await db.tags.get(exam.id))!.color).toBe('#2f6feb')
    await setTagColor(db, exam.id, null)
    expect((await db.tags.get(exam.id))!.color).toBeUndefined()
  })
})

describe('merge and delete', () => {
  it('merge moves pages, text tags, sub-tags and saved searches', async () => {
    const page = await createPage(db, nb, null, 'Heart sounds')
    const typo = await tag('cardoi')
    const cardio = await tag('cardio')
    await tag('cardoi/valves/mitral')
    const keptValves = await tag('cardio/valves')
    await tag('cardoi/murmurs')
    await addPageTag(db, page.id, typo.id)
    await addPageTag(db, page.id, cardio.id)
    const b = await block(page.id, [text('S1 '), tagRun(typo.id)])
    const both = await block(page.id, [tagRun(typo.id), tagRun(cardio.id)])
    const saved = await createSavedSearch(db, 'Typo deck', {
      text: '',
      type: 'card',
      filters: { ...DEFAULT_FILTERS, tagId: typo.id },
    })

    expect(await mergeTag(db, typo.id, cardio.id)).toEqual([page.id])

    expect((await db.tags.get(typo.id))!.deletedAt).not.toBeNull()
    expect((await db.pages.get(page.id))!.tagIds).toEqual([cardio.id])
    expect(inlineTagIds(await reread(b))).toEqual([cardio.id])
    expect(toPlainText((await reread(b)).content)).toBe('S1 ')
    // A block that had both keeps one chip.
    expect(inlineTagIds(await reread(both))).toEqual([cardio.id])
    const rows = await db.blockTags.where('tagId').equals(typo.id).count()
    expect(rows).toBe(0)
    // Same-named sub-tags are merged; others move under the kept tag.
    const tags = await tagMap(db)
    const names = [...tags.keys()].map((id) => tagPathName(tags, id)).sort()
    expect(names).toEqual([
      'cardio',
      'cardio/murmurs',
      'cardio/valves',
      'cardio/valves/mitral',
    ])
    expect(tagPathName(tags, keptValves.id)).toBe('cardio/valves')
    const deck = readSavedQuery((await getSavedSearch(db, saved.id))!.query)
    expect(deck.filters.tagId).toBe(cardio.id)
  })

  it('delete keeps notes, lifts sub-tags, and saved searches use the parent', async () => {
    const page = await createPage(db, nb, null, 'Murmurs')
    const mid = await tag('medicine/cardio')
    const medicine = mid.parentId!
    await tag('medicine/cardio/cardio') // same name as its parent
    await tag('medicine/cardio/valves')
    await addPageTag(db, page.id, mid.id)
    const b = await block(page.id, [text('AS is loud '), tagRun(mid.id)])
    const saved = await createSavedSearch(db, 'Cardio', {
      text: '',
      type: 'all',
      filters: { ...DEFAULT_FILTERS, tagId: mid.id },
    })

    expect(await deleteTag(db, mid.id)).toEqual([page.id])

    expect((await db.pages.get(page.id))!.tagIds).toEqual([])
    expect(inlineTagIds(await reread(b))).toEqual([])
    expect(toPlainText((await reread(b)).content)).toBe('AS is loud ')
    const tags = await tagMap(db)
    const names = [...tags.keys()].map((id) => tagPathName(tags, id)).sort()
    expect(names).toEqual(['medicine', 'medicine/cardio', 'medicine/valves'])
    const deck = readSavedQuery((await getSavedSearch(db, saved.id))!.query)
    expect(deck.filters.tagId).toBe(medicine)
  })
})

describe('tags in search', () => {
  it('counts what each tag lists in Search (Trash left out)', async () => {
    const page = await createPage(db, nb, null, 'Heart sounds')
    const gone = await createPage(db, nb, null, 'Old')
    const cardio = await tag('medicine/cardio')
    await addPageTag(db, page.id, cardio.id)
    await addPageTag(db, gone.id, cardio.id)
    await block(page.id, [text('Which valves close in S1?')], 'card')
    await block(page.id, [text('Plain note')])
    await syncCardRecords(db, page.id)
    await deletePage(db, gone.id)

    const counts = await countTagged(db)
    expect(counts.get(cardio.id)).toBe(2) // the page and its card
    expect(counts.get(cardio.parentId!)).toBe(2)
  })

  it('search words match tag names, together with words in the text', async () => {
    const page = await createPage(db, nb, null, 'Heart sounds')
    const exam = await tag('exam/high-yield')
    await addPageTag(db, page.id, exam.id)
    await block(page.id, [text('Which valves close in S1?')], 'card')
    await block(page.id, [text('Murmurs are noises')])
    await syncCardRecords(db, page.id)
    const search = (words: string) =>
      runSearch(db, { text: words, type: 'all', filters: DEFAULT_FILTERS })

    const byTag = await search('yield')
    expect(byTag.hits.map((h) => h.type).sort()).toEqual(['card', 'page'])
    expect((await search('valves exam')).hits.map((h) => h.type)).toEqual([
      'card',
    ])
    expect((await search('murmurs exam')).hits).toEqual([])

    const details = await describeHits(db, byTag.hits)
    expect(details.get(byTag.hits[0].id)!.tagNames).toEqual(['high-yield'])
  })
})

describe('at 10,000 items', () => {
  // Merging at this size is timed in a real browser (e2e/tags.spec.ts):
  // the test database is very slow at overwriting search entries.
  it('counts a tag typed in 10,000 notes quickly', async () => {
    const page = await createPage(db, nb, null, 'Big')
    const hy = await tag('hy')
    const blocks = Array.from({ length: 10_000 }, (_, i) => ({
      id: `b${String(i).padStart(5, '0')}`,
      pageId: page.id,
      parentId: null,
      type: 'paragraph',
      content: { text: [text(`Fact ${i} `), tagRun(hy.id)] },
      order: `a${i}`,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    }))
    await db.blocks.bulkAdd(blocks)

    const start = performance.now()
    const counts = await countTagged(db)
    const ms = performance.now() - start
    expect(counts.get(hy.id)).toBe(10_000)
    expect(ms).toBeLessThan(5000)
  }, 60_000)
})
