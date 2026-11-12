import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../../core/db'
import { createTestDb } from '../../core/testing'
import { listAnnotations } from '../annotations/annotationService'
import {
  StickyHistory,
  addSticky,
  addStickyOnText,
  edgeScrollSpeed,
  editSticky,
  isDeliberateTap,
  isSticky,
  moveSticky,
  removeSticky,
  stickyAnchor,
  stickyPlace,
} from './sticky'

describe('sticky place', () => {
  it('keeps the place inside the page and rounds it', () => {
    expect(stickyAnchor(3, 0.123456, 0.5)).toEqual({
      type: 'pdf',
      page: 3,
      rects: [0.1235, 0.5, 0, 0],
    })
    expect(stickyAnchor(1, -1, 2)).toEqual({
      type: 'pdf',
      page: 1,
      rects: [0, 1, 0, 0],
    })
  })
  it('reads the place back', () => {
    expect(stickyPlace({ anchor: stickyAnchor(4, 0.25, 0.75) })).toEqual({
      page: 4,
      x: 0.25,
      y: 0.75,
    })
    expect(stickyPlace({ anchor: { type: 'epub', cfi: 'x' } })).toBeNull()
  })
  it('knows a sticky note', () => {
    expect(isSticky({ kind: 'sticky' })).toBe(true)
    expect(isSticky({ kind: 'note' })).toBe(false)
  })
})

describe('a tap that places a note', () => {
  const down = { x: 100, y: 100, at: 1000, pointers: 1 }
  it('accepts a short, still tap', () => {
    expect(isDeliberateTap(down, { x: 103, y: 102, at: 1200 })).toBe(true)
  })
  it('refuses a scroll or a drag', () => {
    expect(isDeliberateTap(down, { x: 100, y: 160, at: 1200 })).toBe(false)
  })
  it('refuses a long rest', () => {
    expect(isDeliberateTap(down, { x: 100, y: 100, at: 2000 })).toBe(false)
  })
  it('refuses a pinch (two pointers)', () => {
    expect(
      isDeliberateTap({ ...down, pointers: 2 }, { x: 100, y: 100, at: 1100 }),
    ).toBe(false)
  })
})

describe('auto-scroll near the edge', () => {
  it('scrolls up near the top, down near the bottom, not in the middle', () => {
    expect(edgeScrollSpeed(10, 0, 800)).toBeLessThan(0)
    expect(edgeScrollSpeed(790, 0, 800)).toBeGreaterThan(0)
    expect(edgeScrollSpeed(400, 0, 800)).toBe(0)
  })
  it('is faster closer to the edge', () => {
    expect(Math.abs(edgeScrollSpeed(2, 0, 800))).toBeGreaterThan(
      Math.abs(edgeScrollSpeed(50, 0, 800)),
    )
  })
})

describe('Undo and Redo steps', () => {
  it('undoes and redoes in order; a new step clears Redo', async () => {
    const log: string[] = []
    const step = (n: string) => ({
      undo: async () => void log.push(`undo ${n}`),
      redo: async () => void log.push(`redo ${n}`),
    })
    const h = new StickyHistory()
    expect(await h.undo()).toBe(false)
    h.push(step('a'))
    h.push(step('b'))
    expect(await h.undo()).toBe(true)
    expect(h.canRedo).toBe(true)
    h.push(step('c'))
    expect(h.canRedo).toBe(false)
    await h.undo()
    await h.undo()
    expect(await h.undo()).toBe(false)
    expect(log).toEqual(['undo b', 'undo c', 'undo a'])
  })
})

describe('sticky notes in the annotation table', () => {
  let db: LearningNotesDB
  beforeEach(() => {
    db = createTestDb()
  })
  afterEach(async () => {
    await db.delete()
  })
  const place = { page: 2, x: 0.4, y: 0.6 }

  it('adds a note as an annotation of kind sticky, and Undo / Redo remove and bring it back', async () => {
    const { annotation, step } = await addSticky(db, 'book1', place, 'Hello')
    let rows = await listAnnotations(db, 'book1')
    expect(rows.map((r) => [r.kind, r.note])).toEqual([['sticky', 'Hello']])
    expect(stickyPlace(rows[0])).toEqual(place)
    await step.undo()
    expect(await listAnnotations(db, 'book1')).toHaveLength(0)
    await step.redo()
    rows = await listAnnotations(db, 'book1')
    expect(rows[0].id).toBe(annotation.id)
  })

  it('adds a note on selected EPUB words, with the words and chapter; Undo / Redo', async () => {
    const anchor = {
      type: 'epub' as const,
      cfi: 'epubcfi(/6/2!/4,/4/1:0,/4/1:9)',
    }
    const quote = { exact: 'quick fox', prefix: 'The ', suffix: ' jumps' }
    const { annotation, step } = await addStickyOnText(
      db,
      'book1',
      { anchor, quote, chapter: 'Chapter 1' },
      'Check',
    )
    const rows = await listAnnotations(db, 'book1')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      kind: 'sticky',
      note: 'Check',
      anchor,
      quote,
      chapter: 'Chapter 1',
    })
    expect(stickyPlace(rows[0])).toBeNull()
    await step.undo()
    expect(await listAnnotations(db, 'book1')).toHaveLength(0)
    await step.redo()
    expect((await listAnnotations(db, 'book1'))[0].id).toBe(annotation.id)
  })

  it('edits the words; Undo brings the old words back', async () => {
    const { annotation } = await addSticky(db, 'book1', place, 'One')
    const step = await editSticky(db, annotation, 'Two')
    expect((await listAnnotations(db, 'book1'))[0].note).toBe('Two')
    await step.undo()
    expect((await listAnnotations(db, 'book1'))[0].note).toBe('One')
    await step.redo()
    expect((await listAnnotations(db, 'book1'))[0].note).toBe('Two')
  })

  it('deletes softly; Undo restores it', async () => {
    const { annotation } = await addSticky(db, 'book1', place, 'Gone')
    const step = await removeSticky(db, annotation)
    expect(await listAnnotations(db, 'book1')).toHaveLength(0)
    await step.undo()
    expect(await listAnnotations(db, 'book1')).toHaveLength(1)
  })

  it('moves to another page; Undo puts it back where it was', async () => {
    const { annotation } = await addSticky(db, 'book1', place, 'Move me')
    const step = await moveSticky(db, annotation, { page: 5, x: 0.1, y: 0.9 })
    expect(stickyPlace((await listAnnotations(db, 'book1'))[0])).toEqual({
      page: 5,
      x: 0.1,
      y: 0.9,
    })
    await step.undo()
    expect(stickyPlace((await listAnnotations(db, 'book1'))[0])).toEqual(place)
  })
})
