import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, deleteBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { JsonValue } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import {
  inlineTagIds,
  mapInlineTags,
  TAG,
  toPlainText,
} from '../editor/mapping'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { syncCardRecords } from '../recall/cardService'
import {
  DEFAULT_FILTERS,
  runSearch,
  type SearchQuery,
} from '../search/searchQuery'
import { ensureSearchIndex } from '../search/searchService'
import { cleanTagName, splitTagPath } from './tagNames'
import {
  addPageTag,
  findOrCreateTagPath,
  findTagChoices,
  removePageTag,
  subTagIds,
  tagMap,
  tagPathName,
} from './tagService'

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
const tagRun = (tagId: string, label = ''): JsonValue => ({
  type: TAG,
  props: { tagId, label },
  content: [],
})
const block = (
  pageId: string,
  runs: JsonValue[],
  type = 'paragraph',
  parentId: string | null = null,
) => createBlock(db, { pageId, type, parentId, content: { text: runs } })

const search = (
  text: string,
  filters: Partial<SearchQuery['filters']> = {},
  type: SearchQuery['type'] = 'all',
) => runSearch(db, { text, type, filters: { ...DEFAULT_FILTERS, ...filters } })

describe('tag names', () => {
  it('cleans names: spaces → "-", no "#" or "/", case kept', () => {
    expect(cleanTagName('  Heart  Sounds ')).toBe('Heart-Sounds')
    expect(splitTagPath('#Medicine / heart sounds/')).toEqual([
      'Medicine',
      'heart-sounds',
    ])
    expect(splitTagPath('###')).toEqual([])
  })

  it('reuses tags that differ only in case or accents', async () => {
    const a = await findOrCreateTagPath(db, 'Médecine/Cardio')
    const b = await findOrCreateTagPath(db, 'medecine/CARDIO')
    expect(b.id).toBe(a.id)
    const tags = await tagMap(db)
    expect(tags.size).toBe(2)
    expect(tagPathName(tags, a.id)).toBe('Médecine/Cardio')
    expect(subTagIds(tags.values(), a.parentId!)).toEqual([a.id])
  })

  it('picker choices: matching levels, then "Create" unless it exists', async () => {
    await findOrCreateTagPath(db, 'medicine/cardio')
    await findOrCreateTagPath(db, 'exam')
    const car = await findTagChoices(db, 'car')
    expect(car.options.map((o) => o.path)).toEqual(['medicine/cardio'])
    expect(car.create).toBe('car')
    expect((await findTagChoices(db, 'med/car')).options).toHaveLength(1)
    expect((await findTagChoices(db, 'exam')).create).toBeNull()
    expect((await findTagChoices(db, '')).options).toHaveLength(3)
    // "#1" stays text: no Create offered for numbers in the "#" menu.
    expect(
      (await findTagChoices(db, '1', { allowNumbers: false })).create,
    ).toBeNull()
  })
})

describe('tagging pages and blocks', () => {
  it('adds and removes page tags', async () => {
    const page = await createPage(db, nb, null, 'Heart sounds')
    const tag = await findOrCreateTagPath(db, 'exam')
    await addPageTag(db, page.id, tag.id)
    await addPageTag(db, page.id, tag.id) // no duplicate
    expect((await db.pages.get(page.id))!.tagIds).toEqual([tag.id])
    await removePageTag(db, page.id, tag.id)
    expect((await db.pages.get(page.id))!.tagIds).toEqual([])
  })

  it('keeps the block tags list in step with saves and deletes', async () => {
    const page = await createPage(db, nb, null, 'Notes')
    const tag = await findOrCreateTagPath(db, 'hy')
    const b = await block(page.id, [text('S1 '), tagRun(tag.id, 'hy')])
    expect(await db.blockTags.toArray()).toEqual([
      {
        id: `${b.id}|${tag.id}`,
        blockId: b.id,
        pageId: page.id,
        tagId: tag.id,
      },
    ])
    expect(toPlainText(b.content)).toBe('S1 ') // tags are not text
    await deleteBlock(db, b.id)
    expect(await db.blockTags.count()).toBe(0)
  })

  it('the backfill rebuilds block tags', async () => {
    const page = await createPage(db, nb, null, 'Notes')
    const tag = await findOrCreateTagPath(db, 'hy')
    await block(page.id, [tagRun(tag.id)])
    await db.blockTags.clear()
    await db.meta.clear()
    await ensureSearchIndex(db)
    expect(await db.blockTags.count()).toBe(1)
  })

  it('maps and removes inline tags', () => {
    const runs = [text('a'), tagRun('t1', 'x'), tagRun('t2', 'y')]
    const next = mapInlineTags(runs, (t) =>
      t.tagId === 't1' ? null : { ...t, tagId: 't3' },
    )
    expect(inlineTagIds({ content: { text: next! } })).toEqual(['t3'])
  })
})

describe('tag filter in search', () => {
  it('cards inherit page tags and answer tags; notes do not inherit', async () => {
    const page = await createPage(db, nb, null, 'Heart sounds')
    const exam = await findOrCreateTagPath(db, 'exam')
    const hy = await findOrCreateTagPath(db, 'hy')
    await addPageTag(db, page.id, exam.id)
    const card = await block(
      page.id,
      [text('Which valves close in S1?')],
      'card',
    )
    await block(
      page.id,
      [text('Mitral valves '), tagRun(hy.id)],
      'paragraph',
      card.id,
    )
    await block(page.id, [text('Valves are flaps')])
    await syncCardRecords(db, page.id)

    const byExam = await search('valves', { tagId: exam.id })
    expect(byExam.hits.map((h) => h.type)).toEqual(['card'])
    const byHy = await search('valves', { tagId: hy.id })
    // The card (answer tag) and the tagged answer block itself.
    expect(byHy.hits.map((h) => h.type).sort()).toEqual(['card', 'note'])
    const all = await search('valves')
    expect(all.tagCounts.get(exam.id)).toBe(1)
    expect(all.tagCounts.get(hy.id)).toBe(2)
  })

  it('a parent tag covers its sub-tags; a tag can be browsed without words', async () => {
    const page = await createPage(db, nb, null, 'Murmurs')
    const cardio = await findOrCreateTagPath(db, 'medicine/cardio')
    await addPageTag(db, page.id, cardio.id)
    await block(page.id, [text('Where is AS heard?')], 'card')
    await syncCardRecords(db, page.id)
    const medicine = cardio.parentId!

    const browse = await search('', { tagId: medicine })
    expect(browse.active).toBe(true)
    expect(browse.hits.map((h) => h.type).sort()).toEqual(['card', 'page'])
    expect(browse.tagCounts.get(cardio.id)).toBe(2)
    expect((await search('', {})).active).toBe(false)
  })

  it('filters 10,000 tagged cards quickly', async () => {
    const page = await createPage(db, nb, null, 'Big deck')
    const tag = await findOrCreateTagPath(db, 'big')
    await addPageTag(db, page.id, tag.id)
    const blocks = Array.from({ length: 10_000 }, (_, i) => ({
      id: `b${String(i).padStart(5, '0')}`,
      pageId: page.id,
      parentId: null,
      type: 'card',
      content: { text: [text(`Question ${i}`)] },
      order: `a${i}`,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    }))
    await db.blocks.bulkAdd(blocks)
    await syncCardRecords(db, page.id)

    const start = performance.now()
    const result = await search('', { tagId: tag.id }, 'card')
    const ms = performance.now() - start
    expect(result.hits).toHaveLength(10_000)
    expect(ms).toBeLessThan(5000)
  }, 60_000)
})
