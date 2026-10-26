import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  copyBlocks,
  createBlock,
  deleteBlock,
  saveBlockChanges,
} from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { Block, SearchEntry } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { plainText } from '../editor/mapping'
import { createNotebook, deleteNotebook } from '../notebooks/notebookService'
import { createPage, deletePage, renamePage } from '../pages/pageService'
import { CARD_BLOCK_TYPE } from '../recall/cardService'
import { purgePage, restorePage } from '../trash/trashService'
import {
  ensureSearchIndex,
  isSearchIndexReady,
  searchIndex,
} from './searchService'
import { titleEntryId } from './searchText'

let db: LearningNotesDB
let ws: string
let nb: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
  nb = (await createNotebook(db, ws, 'Biology')).id
})

afterEach(async () => {
  await db.delete()
})

const paragraph = (pageId: string, text: string) =>
  createBlock(db, {
    pageId,
    type: 'paragraph',
    content: { text: plainText(text) },
  })

/** Ids of the matches, best first. */
const find = async (text: string, includeDeleted = false) =>
  (await searchIndex(db, text, { includeDeleted })).matches.map(
    (m) => m.entry.id,
  )

describe('index stays up to date on every save', () => {
  it('indexes titles, text and cards; renames and edits replace words', async () => {
    const page = await createPage(db, nb, null, 'Heart valves')
    const text = await paragraph(page.id, 'The mitral valve has two leaflets')
    expect(await find('mitral')).toEqual([text.id])
    expect(await find('heart')).toEqual([titleEntryId(page.id)])

    await renamePage(db, page.id, 'Cardiology')
    expect(await find('heart')).toEqual([])
    expect(await find('cardio')).toEqual([titleEntryId(page.id)])

    await saveBlockChanges(db, page.id, {
      upserts: [{ ...text, content: { text: plainText('Aortic valve') } }],
      deletes: [],
    })
    expect(await find('mitral')).toEqual([])
    expect(await find('aortic')).toEqual([text.id])
    const entry = (await db.searchEntries.get(text.id))!
    expect(entry).toMatchObject({
      kind: 'text',
      pageId: page.id,
      notebookId: nb,
    })
  })

  it('a block that makes cards ranks as a card', async () => {
    const page = await createPage(db, nb, null, 'P')
    const card = await createBlock(db, {
      pageId: page.id,
      type: CARD_BLOCK_TYPE,
      content: { text: plainText('What is ATP?') },
    })
    const blank = await createBlock(db, {
      pageId: page.id,
      type: 'paragraph',
      content: {
        text: [
          { type: 'text', text: 'ATP stores ', styles: {} },
          { type: 'text', text: 'energy', styles: { blank: 'x1' } },
        ],
      },
    })
    expect((await db.searchEntries.get(card.id))!.kind).toBe('card')
    expect((await db.searchEntries.get(blank.id))!.kind).toBe('card')
  })

  it('emptied blocks leave the index', async () => {
    const page = await createPage(db, nb, null, 'P')
    const block = await paragraph(page.id, 'Something')
    await saveBlockChanges(db, page.id, {
      upserts: [{ ...block, content: { text: [] } }],
      deletes: [],
    })
    expect(await db.searchEntries.get(block.id)).toBeUndefined()
  })

  it('Trash: hidden unless asked; restore brings back; Delete forever erases', async () => {
    const page = await createPage(db, nb, null, 'Kidney')
    const block = await paragraph(page.id, 'Nephron loop')
    await deletePage(db, page.id)
    expect(await find('nephron')).toEqual([])
    expect(await find('nephron', true)).toEqual([block.id])

    await restorePage(db, page.id)
    expect(await find('nephron')).toEqual([block.id])

    await deletePage(db, page.id)
    await purgePage(db, page.id)
    expect(await find('nephron', true)).toEqual([])
    expect(await find('kidney', true)).toEqual([])
  })

  it('deleting a block or notebook hides its entries', async () => {
    const page = await createPage(db, nb, null, 'Lungs')
    const block = await paragraph(page.id, 'Alveoli')
    await deleteBlock(db, block.id)
    expect(await find('alveoli')).toEqual([])

    const other = await paragraph(page.id, 'Bronchi')
    await deleteNotebook(db, nb)
    expect(await find('bronchi')).toEqual([])
    expect(await find('bronchi', true)).toEqual([other.id])
  })

  it('copied blocks (templates) are indexed', async () => {
    const from = await createPage(db, nb, null, 'From')
    await paragraph(from.id, 'Template words')
    const to = await createPage(db, nb, null, 'To')
    await copyBlocks(db, from.id, to.id)
    const pages = (await searchIndex(db, 'template')).matches.map(
      (m) => m.entry.pageId,
    )
    expect(pages.sort()).toEqual([from.id, to.id].sort())
  })

  it('a page moved to another notebook takes its entries along', async () => {
    const page = await createPage(db, nb, null, 'Page')
    const block = await paragraph(page.id, 'Moving words')
    const other = (await createNotebook(db, ws, 'Other')).id
    // No "move to another notebook" exists yet; any future one saves this.
    await db.pages.update(page.id, { notebookId: other })
    expect((await db.searchEntries.get(block.id))!.notebookId).toBe(other)
    expect(
      (await db.searchEntries.get(titleEntryId(page.id)))!.notebookId,
    ).toBe(other)
  })

  it('a failed save leaves the index unchanged', async () => {
    const page = await createPage(db, nb, null, 'P')
    await expect(
      db.transaction('rw', db.pages, db.blocks, async () => {
        await paragraph(page.id, 'Rolled back')
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(await find('rolled')).toEqual([])
  })
})

describe('searchIndex', () => {
  it('needs every word, each as a word start, any order', async () => {
    const page = await createPage(db, nb, null, 'P')
    const a = await paragraph(page.id, 'Mitochondria make ATP')
    await paragraph(page.id, 'Mitochondria only')
    expect(await find('atp mito')).toEqual([a.id])
    expect(await find('chondria')).toEqual([]) // not a word start
  })

  it('ranks title > card > text, whole words first', async () => {
    const page = await createPage(db, nb, null, 'Osmosis')
    const text = await paragraph(page.id, 'Osmosis moves water')
    const card = await createBlock(db, {
      pageId: page.id,
      type: CARD_BLOCK_TYPE,
      content: { text: plainText('Define osmosis') },
    })
    const prefixOnly = await paragraph(page.id, 'Osmotic pressure')
    expect((await find('osmo')).slice(0, 2)).toEqual([
      titleEntryId(page.id),
      card.id,
    ])
    // "osmosis" is a whole word in `text` but only a prefix of "osmotic".
    expect((await find('osmosis')).slice(2)).toEqual([text.id])
    expect(await find('osmotic')).toEqual([prefixOnly.id])

    // `prefix` is newer, so only the whole-word bonus puts `whole` first.
    const whole = await paragraph(page.id, 'Cell wall')
    await new Promise((resolve) => setTimeout(resolve, 2))
    const prefix = await paragraph(page.id, 'Cells divide')
    expect(await find('cell')).toEqual([whole.id, prefix.id])
  })

  it('finds nothing for empty or punctuation-only text', async () => {
    const page = await createPage(db, nb, null, 'P')
    await paragraph(page.id, 'Words')
    expect(await searchIndex(db, '  ?! ')).toEqual({ matches: [], total: 0 })
  })

  it('accent- and case-insensitive both ways', async () => {
    const page = await createPage(db, nb, null, 'Café culture')
    expect(await find('CAFE')).toEqual([titleEntryId(page.id)])
    expect(await find('café')).toEqual([titleEntryId(page.id)])
  })

  it('limit cuts the list; total counts all', async () => {
    const page = await createPage(db, nb, null, 'P')
    for (let i = 0; i < 5; i++) await paragraph(page.id, `Item ${i}`)
    const result = await searchIndex(db, 'item', { limit: 2 })
    expect(result.matches).toHaveLength(2)
    expect(result.total).toBe(5)
  })
})

describe('ensureSearchIndex (backfill)', () => {
  /** Simulates notes saved before the index existed. */
  async function forgetIndex() {
    await db.searchEntries.clear()
    await db.meta.delete('searchIndex')
  }

  it('indexes existing notes in chunks and is then ready', async () => {
    const page = await createPage(db, nb, null, 'Old page')
    for (let i = 0; i < 7; i++) await paragraph(page.id, `Old note ${i}`)
    await forgetIndex()
    expect(await isSearchIndexReady(db)).toBe(false)
    expect(await find('old')).toEqual([])

    await ensureSearchIndex(db, 3)
    expect(await isSearchIndexReady(db)).toBe(true)
    expect((await searchIndex(db, 'old')).total).toBe(8)
  })

  it('resumes from saved progress', async () => {
    const page = await createPage(db, nb, null, 'P')
    const blocks: Block[] = []
    for (let i = 0; i < 4; i++)
      blocks.push(await paragraph(page.id, `Note ${i}`))
    await forgetIndex()
    const sorted = blocks.map((b) => b.id).sort()
    // Stopped after the first two blocks (by id).
    await db.meta.put({
      id: 'searchIndex',
      value: { version: 1, next: { table: 'blocks', after: sorted[1] } },
    })
    await ensureSearchIndex(db)
    const ids = (await db.searchEntries.toArray()).map((e) => e.id).sort()
    expect(ids).toEqual(sorted.slice(2)) // only the rest was done
  })

  it('rebuilds after an index format change, keeping saves made meanwhile', async () => {
    const page = await createPage(db, nb, null, 'P')
    const block = await paragraph(page.id, 'Fresh')
    await db.searchEntries.put({
      ...((await db.searchEntries.get(block.id)) as SearchEntry),
      words: ['stale'],
    })
    await db.meta.put({ id: 'searchIndex', value: { version: 0 } })
    await ensureSearchIndex(db)
    expect(await find('stale')).toEqual([])
    expect(await find('fresh')).toEqual([block.id])
  })

  it('does nothing when already up to date', async () => {
    await ensureSearchIndex(db)
    const before = await db.meta.get('searchIndex')
    await ensureSearchIndex(db)
    expect(await db.meta.get('searchIndex')).toEqual(before)
  })
})
