import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, deleteBlock, updateBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { Block, JsonValue } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import {
  linkTargets,
  NOTE_LINK,
  plainText,
  toPlainText,
} from '../editor/mapping'
import { createNotebook } from '../notebooks/notebookService'
import { createPage, deletePage, renamePage } from '../pages/pageService'
import { CARD_BLOCK_TYPE, hasQuestion } from '../recall/cardService'
import { ensureSearchIndex, searchIndex } from '../search/searchService'
import { purgePage, restorePage } from '../trash/trashService'
import {
  findLinkPages,
  getBacklinks,
  linkAnchors,
  resolveLink,
  sentenceAround,
  withCurrentLabels,
} from './linkService'

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

/** A note link run (as the editor stores it). */
const link = (pageId: string, label: string, blockId = ''): JsonValue => ({
  type: NOTE_LINK,
  props: { pageId, blockId, label },
  content: [],
})
const text = (t: string): JsonValue => ({ type: 'text', text: t, styles: {} })

/** A paragraph made of text and links. */
const paragraph = (pageId: string, runs: JsonValue[], type = 'paragraph') =>
  createBlock(db, { pageId, type, content: { text: runs } })

const linkRows = () => db.links.toArray()

describe('links list stays up to date', () => {
  it('saving, editing, deleting and restoring a block updates its links', async () => {
    const target = await createPage(db, nb, null, 'Heart sounds')
    const other = await createPage(db, nb, null, 'Murmurs')
    const source = await createPage(db, nb, null, 'Notes')
    const block = await paragraph(source.id, [
      text('See '),
      link(target.id, 'Heart sounds'),
      text(' and '),
      link(target.id, 'Heart sounds'), // same target twice: one row
    ])
    expect(await linkRows()).toEqual([
      {
        id: `${block.id}|0`,
        fromBlockId: block.id,
        fromPageId: source.id,
        toPageId: target.id,
      },
    ])

    await updateBlock(db, block.id, {
      content: { text: [link(other.id, 'Murmurs', 'h1')] },
    })
    expect((await linkRows()).map((r) => [r.toPageId, r.toBlockId])).toEqual([
      [other.id, 'h1'],
    ])

    await deletePage(db, source.id) // its blocks go to the Trash
    expect(await linkRows()).toEqual([])
    await restorePage(db, source.id)
    expect(await linkRows()).toHaveLength(1)
  })

  it('page link blocks count as links', async () => {
    const target = await createPage(db, nb, null, 'Sub')
    const source = await createPage(db, nb, null, 'Parent')
    await createBlock(db, {
      pageId: source.id,
      type: 'pageLink',
      content: { pageId: target.id },
    })
    expect((await linkRows()).map((r) => r.toPageId)).toEqual([target.id])
  })

  it('the backfill rebuilds the links list', async () => {
    const target = await createPage(db, nb, null, 'Target')
    const source = await createPage(db, nb, null, 'Source')
    await paragraph(source.id, [link(target.id, 'Target')])
    await db.links.clear()
    await db.meta.delete('searchIndex')
    await ensureSearchIndex(db)
    expect(await linkRows()).toHaveLength(1)
  })
})

describe('link text', () => {
  it('plain-text views, search and cards use the label', async () => {
    const target = await createPage(db, nb, null, 'Aortic valve')
    const source = await createPage(db, nb, null, 'Notes')
    const runs = [text('Compare with '), link(target.id, 'Aortic valve')]
    const block = await paragraph(source.id, runs)
    expect(toPlainText(block.content)).toBe('Compare with Aortic valve')
    expect(linkTargets(block)).toEqual([{ pageId: target.id, blockId: '' }])
    expect((await searchIndex(db, 'aortic')).total).toBe(2) // title + note
    // A card whose question is only a link still has a question.
    expect(
      hasQuestion({
        type: CARD_BLOCK_TYPE,
        content: { text: [link(target.id, 'Aortic valve')] },
      }),
    ).toBe(true)
  })

  it('resolveLink shows current titles; deleted headings fall back to the page', async () => {
    const page = await createPage(db, nb, null, 'Heart')
    const heading = await createBlock(db, {
      pageId: page.id,
      type: 'heading',
      content: { text: plainText('S2'), level: 2 },
    })
    expect(
      await resolveLink(db, { pageId: page.id, blockId: heading.id }),
    ).toEqual({ state: 'live', title: 'Heart', anchor: 'S2' })

    await renamePage(db, page.id, 'Heart sounds')
    await deleteBlock(db, heading.id)
    expect(
      await resolveLink(db, { pageId: page.id, blockId: heading.id }),
    ).toEqual({ state: 'live', title: 'Heart sounds', anchor: null })

    await deletePage(db, page.id)
    expect(
      (await resolveLink(db, { pageId: page.id, blockId: '' })).state,
    ).toBe('trash')
    await purgePage(db, page.id)
    expect(
      (await resolveLink(db, { pageId: page.id, blockId: '' })).state,
    ).toBe('gone')
  })

  it('withCurrentLabels updates labels for read-only views', async () => {
    const page = await createPage(db, nb, null, 'Old name')
    await renamePage(db, page.id, 'New name')
    const [runs] = await withCurrentLabels(db, [[link(page.id, 'Old name')]])
    expect(toPlainText({ text: runs })).toBe('New name')
  })
})

describe('picker data', () => {
  it('finds pages by title words, Trash left out', async () => {
    const heart = await createPage(db, nb, null, 'Heart sounds')
    await createPage(db, nb, null, 'Lung sounds')
    const trashed = await createPage(db, nb, null, 'Heart failure')
    await deletePage(db, trashed.id)
    // A note mentioning "heart" is not a page match.
    await paragraph(heart.id, [text('heart rate')])
    expect((await findLinkPages(db, 'hea')).map((p) => p.title)).toEqual([
      'Heart sounds',
    ])
    expect(await findLinkPages(db, 'sounds')).toHaveLength(2)
  })

  it('lists headings and cards in reading order', async () => {
    const page = await createPage(db, nb, null, 'Heart')
    await createBlock(db, {
      pageId: page.id,
      type: 'heading',
      content: { text: plainText('S1'), level: 2 },
    })
    await paragraph(page.id, [text('plain text')])
    const card = await paragraph(
      page.id,
      [text('What is S2?')],
      CARD_BLOCK_TYPE,
    )
    await paragraph(page.id, [], CARD_BLOCK_TYPE) // empty card: left out
    expect(await linkAnchors(db, page.id)).toEqual([
      expect.objectContaining({ kind: 'heading', text: 'S1' }),
      { blockId: card.id, kind: 'card', text: 'What is S2?' },
    ])
  })
})

describe('Linked from', () => {
  it('lists blocks on other pages with the sentence around the link', async () => {
    const heart = await createPage(db, nb, null, 'Heart sounds')
    const murmurs = await createPage(db, nb, null, 'Murmurs')
    const block = await paragraph(murmurs.id, [
      text(
        'Murmurs are extra sounds. A murmur between S1 and S2 is systolic; see ',
      ),
      link(heart.id, 'Old title'),
      text(' for timing. Diastolic ones are rarer.'),
    ])
    // Links within the page itself are not listed.
    await paragraph(heart.id, [link(heart.id, 'Heart sounds')])

    const result = await getBacklinks(db, heart.id)
    expect(result.total).toBe(1)
    expect(result.items).toEqual([
      {
        blockId: block.id,
        pageId: murmurs.id,
        pageTitle: 'Murmurs',
        notebookId: nb,
        before: 'A murmur between S1 and S2 is systolic; see ',
        link: 'Heart sounds', // the current title, not the stored label
        after: ' for timing.',
      },
    ])
  })

  it('shows the heading linked to, and leaves out pages in the Trash', async () => {
    const heart = await createPage(db, nb, null, 'Heart')
    const s2 = await createBlock(db, {
      pageId: heart.id,
      type: 'heading',
      content: { text: plainText('S2'), level: 2 },
    })
    const a = await createPage(db, nb, null, 'A')
    const b = await createPage(db, nb, null, 'B')
    await paragraph(a.id, [link(heart.id, 'Heart › S2', s2.id)])
    await paragraph(b.id, [link(heart.id, 'Heart')])
    expect((await getBacklinks(db, heart.id)).items.map((i) => i.link)).toEqual(
      expect.arrayContaining(['Heart › S2', 'Heart']),
    )
    await deletePage(db, b.id)
    const after = await getBacklinks(db, heart.id)
    expect(after.total).toBe(1)
    expect(after.items[0].pageTitle).toBe('A')
  })

  it('sentenceAround: a page link block is just the link', () => {
    const block = { type: 'pageLink', content: { pageId: 'p' } }
    expect(sentenceAround(block, 'p', () => 'Sub page')).toEqual({
      before: '',
      link: 'Sub page',
      after: '',
    })
  })

  it('10,000 links to one page: the first 20 load quickly', async () => {
    const target = await createPage(db, nb, null, 'Popular')
    const pages = await Promise.all(
      Array.from({ length: 50 }, (_, i) => createPage(db, nb, null, `P${i}`)),
    )
    const now = Date.now()
    const blocks: Block[] = Array.from({ length: 10_000 }, (_, i) => ({
      id: `b${String(i).padStart(6, '0')}`,
      pageId: pages[i % 50].id,
      parentId: null,
      type: 'paragraph',
      content: { text: [text(`Note ${i} about `), link(target.id, 'Popular')] },
      order: `a${i}`,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }))
    await db.blocks.bulkAdd(blocks) // links listed on save
    expect(await db.links.count()).toBe(10_000)

    const started = performance.now()
    const result = await getBacklinks(db, target.id)
    const took = performance.now() - started
    expect(result.total).toBe(10_000)
    expect(result.items).toHaveLength(20)
    expect(took).toBeLessThan(1500) // in-memory test DB; browsers are faster
  }, 60_000)
})
