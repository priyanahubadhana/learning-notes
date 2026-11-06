import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createId } from '../core/ids'
import { saveInk } from '../core/inkService'
import type { InkChunk, Stroke } from '../core/inkTypes'
import { MAX_LABEL } from '../core/inkTypes'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage, deletePage } from '../pages/pageService'
import { restorePage } from '../trash/trashService'
import { checkedRow } from '../share/checkRows'
import { DEFAULT_FILTERS, describeHits, runSearch } from './searchQuery'
import { searchIndex } from './searchService'
import { inkEntry, inkLabels } from './searchText'

const T = 1_700_000_000_000
const stroke = (label?: string): Stroke => ({
  id: createId(),
  at: T,
  kind: 'ink',
  bw: 800,
  style: {
    pen: 'fountain',
    width: 3,
    colour: '#000',
    opacity: 1,
    sharpness: 50,
    pressure: 60,
    flatness: 20,
    stabilisation: 30,
    tilt: true,
    speedWidth: false,
    line: 'solid',
    behind: false,
  },
  pts: [0, 0, 0.5, 0, 0, 0, 0.1, 0.1, 0.5, 0, 0, 5],
  ...(label && { label }),
})
const chunk = (
  pageId: string,
  strokes: Stroke[],
  over: Partial<InkChunk> = {},
): InkChunk => ({
  id: createId(),
  pageId,
  layerId: 'layer',
  blockId: null,
  strokes,
  createdAt: T,
  updatedAt: T,
  deletedAt: null,
  ...over,
})

let db: LearningNotesDB
let pageId: string
beforeEach(async () => {
  db = createTestDb()
  await db.open()
  const ws = await getOrCreateDefaultWorkspace(db)
  const nb = await createNotebook(db, ws.id, 'Anatomy')
  pageId = (await createPage(db, nb.id, null, 'Heart')).id
})
afterEach(() => db.close())

describe('drawing labels in Search (G3)', () => {
  it('lists each live label once', () => {
    const live = chunk(pageId, [stroke('Aorta'), stroke('Aorta'), stroke()])
    const gone = chunk(pageId, [stroke('Hidden')], { deletedAt: T })
    expect(inkLabels([live, gone])).toEqual(['Aorta'])
    expect(
      inkEntry({ id: pageId, notebookId: 'n', deletedAt: null }, [gone]),
    ).toBeNull()
  })

  it('finds a labelled drawing, and forgets it when the label goes', async () => {
    const c = chunk(pageId, [stroke('Left ventricle diagram')])
    await saveInk(db, [], [c])
    const found = await searchIndex(db, 'ventricle')
    expect(found.matches.map((m) => m.entry.id)).toEqual([`ink:${pageId}`])
    expect(found.matches[0].entry.kind).toBe('ink')

    // The result row shows the label as its text.
    const outcome = await runSearch(db, {
      text: 'ventricle',
      type: 'all',
      filters: DEFAULT_FILTERS,
    })
    const details = await describeHits(db, outcome.hits)
    expect([...details.values()][0].text).toBe('Left ventricle diagram')

    // Removing the label (a new save of the chunk) removes the entry.
    await saveInk(db, [], [{ ...c, strokes: [stroke()], updatedAt: T + 1 }])
    expect((await searchIndex(db, 'ventricle')).total).toBe(0)
  })

  it('hides a label when its drawing is deleted or its page is in the Trash', async () => {
    const c = chunk(pageId, [stroke('Aorta sketch')])
    await saveInk(db, [], [c])
    expect((await searchIndex(db, 'aorta')).total).toBe(1)
    await deletePage(db, pageId)
    // The entry is kept but flagged, like blocks of a trashed page.
    expect((await searchIndex(db, 'aorta')).total).toBe(0)
    expect(
      (await searchIndex(db, 'aorta', { includeDeleted: true })).total,
    ).toBe(1)
    // Restoring the page brings it back.
    await restorePage(db, pageId)
    expect((await searchIndex(db, 'aorta')).total).toBe(1)
  })

  it('accepts a label in a backup row, and refuses a huge one', () => {
    const row = (s: Stroke) =>
      checkedRow('inkChunks', chunk(pageId, [s]) as never)
    expect(row(stroke('ok'))).not.toBeNull()
    expect(row(stroke('x'.repeat(MAX_LABEL + 1)))).toBeNull()
  })
})
