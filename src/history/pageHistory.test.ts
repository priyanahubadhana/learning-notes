import { describe, expect, it, beforeEach } from 'vitest'
import { newRecordFields } from '../core/records'
import { softDeleteMany } from '../core/records'
import { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import {
  journalOf,
  LIMIT,
  persistNow,
  ready,
  setActive,
  undo,
  redo,
} from './pageHistory'
import { HISTORY_TABLES } from '../core/rowCapture'
import {
  group,
  historyState,
  pushStep,
  quietAsync,
  quietly,
} from '../core/historySteps'

// The journal talks to the shared database; point it at a test one.
import * as dbModule from '../core/db'

let db: LearningNotesDB

const page = (id: string, extra: Partial<Page> = {}): Page => ({
  ...newRecordFields(),
  id,
  notebookId: 'n',
  parentId: null,
  title: 'T',
  order: 'a',
  ...extra,
})

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms))

beforeEach(async () => {
  db = dbModule.db
  await db.delete()
  await db.open()
  await db.pages.add(page('p1', { boxes: [] }))
  setActive('page:p1')
  await ready('page:p1')
  const j = journalOf('page:p1')
  j.done.length = 0
  j.undone.length = 0
})

/** Tables that are not actions (helper lists, logs, settings, files, drawings). */
const NOT_ACTIONS = [
  'cards',
  'blockTags',
  'workspaces',
  'notebooks',
  'reviewLogs',
  'settings',
  'savedSearches',
  'searchEntries',
  'links',
  'meta',
  'rowRefs',
  'pageVersions',
  'images',
  'fonts',
  'layerInstalls',
  'summaryItems',
  'inkLayers',
  'inkChunks',
  'recordings',
  'bookFiles',
  'annotations',
  'syncState',
  'tasks',
  'projects',
  'timeEntries',
  'dayPlans',
  'habits',
  'habitChecks',
  'files',
  'secrets',
]

describe('page history', () => {
  it('lists every table of the database (nothing can bypass Undo)', () => {
    const missing = db.tables
      .map((t) => t.name)
      .filter((n) => !(n in HISTORY_TABLES) && !NOT_ACTIONS.includes(n))
    expect(missing).toEqual([])
  })

  it('records a page setting, undoes and redoes it', async () => {
    await db.pages.update('p1', { inkBg: 'grid' })
    await tick()
    expect(journalOf('page:p1').done).toHaveLength(1)
    expect(historyState.get().canUndo).toBe(true)
    expect(await undo()).toBe(true)
    expect((await db.pages.get('p1'))?.inkBg).toBeUndefined()
    expect(historyState.get().canRedo).toBe(true)
    expect(await redo()).toBe(true)
    expect((await db.pages.get('p1'))?.inkBg).toBe('grid')
  })

  it('does not record a bookkeeping field or the work of Undo itself', async () => {
    await db.pages.update('p1', { updatedAt: 5, summary: 'x' })
    await tick()
    expect(journalOf('page:p1').done).toHaveLength(0)
  })

  it('records a box change and a new action clears Redo', async () => {
    await db.pages.update('p1', { boxes: [{ id: 'b', x: 0, y: 0, w: 10 }] })
    await tick()
    await undo()
    expect((await db.pages.get('p1'))?.boxes).toEqual([])
    await db.pages.update('p1', { sheet: 'Letter' })
    await tick()
    expect(journalOf('page:p1').undone).toHaveLength(0)
    expect(historyState.get().canRedo).toBe(false)
  })

  it('makes a group one step and keeps the order of mixed steps', async () => {
    const log: string[] = []
    pushStep({
      kind: 'x',
      label: 'A',
      undo: () => log.push('uA'),
      redo: () => log.push('rA'),
    })
    group('Both', () => {
      pushStep({
        kind: 'x',
        label: 'B1',
        undo: () => log.push('uB1'),
        redo: () => log.push('rB1'),
      })
      pushStep({
        kind: 'x',
        label: 'B2',
        undo: () => log.push('uB2'),
        redo: () => log.push('rB2'),
      })
    })
    await tick()
    expect(journalOf('page:p1').done).toHaveLength(2)
    await undo()
    await undo()
    expect(log).toEqual(['uB2', 'uB1', 'uA'])
    await redo()
    await redo()
    expect(log.slice(3)).toEqual(['rA', 'rB1', 'rB2'])
  })

  it('keeps at least 200 steps and never makes a step from a quiet write', async () => {
    for (let i = 0; i < LIMIT + 20; i++)
      pushStep({
        kind: 'x',
        label: `s${i}`,
        undo: () => true,
        redo: () => true,
      })
    await tick()
    expect(journalOf('page:p1').done).toHaveLength(LIMIT)
    quietly(() => pushStep({ kind: 'x', label: 'q', undo: () => true }))
    await tick()
    expect(journalOf('page:p1').done).toHaveLength(LIMIT)
  })

  it('says why when a step cannot be undone, and skips it', async () => {
    pushStep({
      kind: 'x',
      label: 'Broken',
      undo: () => {
        throw new Error('it is gone')
      },
    })
    await tick()
    expect(await undo()).toBe(false)
    expect(journalOf('page:p1').done).toHaveLength(0)
  })

  it('survives a reload: data steps are saved per page', async () => {
    await db.pages.update('p1', { inkBg: 'dots' })
    await tick()
    await persistNow('page:p1')
    const saved = await db.meta.get('hist:page:p1')
    expect(saved).toBeTruthy()
    expect(JSON.stringify(saved?.value)).toContain('dots')
  })
})

describe('boxes and their lines', () => {
  it('a taken-back box takes its lines along and brings them back', async () => {
    await db.pages.update('p1', { boxes: [{ id: 'b1', x: 1, y: 2, w: 50 }] })
    await tick()
    // The box's lines are saved by the editor on its own (not a step).
    await quietAsync(() =>
      db.blocks.add({
        ...newRecordFields(),
        id: 'blk1',
        pageId: 'p1',
        parentId: null,
        type: 'paragraph',
        content: { text: [] },
        order: 'a',
        boxId: 'b1',
      } as never),
    )
    expect(await undo()).toBe(true)
    expect((await db.pages.get('p1'))?.boxes).toEqual([])
    expect((await db.blocks.get('blk1'))?.deletedAt).not.toBeNull()
    expect(await redo()).toBe(true)
    expect((await db.pages.get('p1'))?.boxes).toHaveLength(1)
    expect((await db.blocks.get('blk1'))?.deletedAt).toBeNull()
  })
})

describe('bulk writes', () => {
  it('a delete of a box with its lines (bulkUpdate) is one step that brings them back', async () => {
    await quietAsync(async () => {
      await db.pages.update('p1', { boxes: [{ id: 'b1', x: 1, y: 2, w: 50 }] })
      await db.blocks.add({
        ...newRecordFields(),
        id: 'blk2',
        pageId: 'p1',
        parentId: null,
        type: 'paragraph',
        content: { text: [{ type: 'text', text: 'hi', styles: {} }] },
        order: 'a',
        boxId: 'b1',
      } as never)
    })
    await db.transaction('rw', db.pages, db.blocks, async () => {
      await softDeleteMany(db.blocks, ['blk2'], Date.now())
      await db.pages.update('p1', { boxes: [] })
    })
    await tick()
    expect(journalOf('page:p1').done).toHaveLength(1)
    await undo()
    expect((await db.blocks.get('blk2'))?.deletedAt).toBeNull()
    expect((await db.pages.get('p1'))?.boxes).toHaveLength(1)
  })
})

describe('the box service', () => {
  it('removeBox is one step that restoreBox-style Undo brings back', async () => {
    const { addBox, removeBox } = await import('../paper/boxService')
    const id = await addBox(db, 'p1', { x: 10, y: 10, w: 60 } as never)
    await tick()
    await quietAsync(() =>
      db.blocks.add({
        ...newRecordFields(),
        id: 'blk3',
        pageId: 'p1',
        parentId: null,
        type: 'paragraph',
        content: { text: [{ type: 'text', text: 'hello', styles: {} }] },
        order: 'a',
        boxId: id as string,
      } as never),
    )
    await removeBox(db, 'p1', id as string)
    await tick()
    const done = journalOf('page:p1').done

    expect(done.length).toBeGreaterThan(1)
    await undo()
    expect((await db.blocks.get('blk3'))?.deletedAt).toBeNull()
    expect((await db.pages.get('p1'))?.boxes).toHaveLength(1)
  })
})
