import { memStore } from '../../app/tools/store'
import type { LearningNotesDB } from '../../core/db'
import type { Annotation } from '../../core/types'
import {
  createAnnotation,
  deleteAnnotation,
  restoreAnnotation,
  updateAnnotation,
} from '../annotations/annotationService'

/**
 * Sticky notes (slice 7c). A sticky note is an ordinary annotation of kind
 * 'sticky' on a PDF page: its place is the point `rects = [x, y, 0, 0]`, each
 * 0 to 1 of the page. Same table, same sync, export and backup as the rest.
 */

/** The Sticky tool is armed: the next tap on a page puts a note there. */
export const stickyArmed = memStore<boolean>(false)

/** What the sticky dialogs show now. A 'new' note is only saved when its text is saved. */
export type StickyView =
  | { mode: 'read'; id: string }
  | { mode: 'edit'; id: string }
  | { mode: 'new'; page: number; x: number; y: number }
  | null
export const stickyView = memStore<StickyView>(null)

/** A note lifted by a long-press and being dragged (viewport pixels). */
export interface StickyLift {
  id: string
  x: number
  y: number
}
export const stickyLift = memStore<StickyLift | null>(null)

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const round4 = (n: number) => Math.round(n * 10000) / 10000

export function stickyAnchor(
  page: number,
  x: number,
  y: number,
): Annotation['anchor'] {
  return {
    type: 'pdf',
    page,
    rects: [round4(clamp01(x)), round4(clamp01(y)), 0, 0],
  }
}

export const isSticky = (a: Pick<Annotation, 'kind'>): boolean =>
  a.kind === 'sticky'

/** Page and place (0 to 1) of a sticky note, or null when it has none. */
export function stickyPlace(
  a: Pick<Annotation, 'anchor'>,
): { page: number; x: number; y: number } | null {
  const an = a.anchor
  if (an.type !== 'pdf' || an.rects.length < 2) return null
  return { page: an.page, x: an.rects[0], y: an.rects[1] }
}

/** Longest press and furthest move that still count as a tap (px, ms). */
export const TAP_MAX_MOVE = 10
export const TAP_MAX_MS = 600

/**
 * Did a press-and-lift put a note down on purpose? Only a short, still tap
 * of ONE pointer does. A scroll, a pinch, a drag or a long rest do not.
 */
export function isDeliberateTap(
  down: { x: number; y: number; at: number; pointers: number },
  up: { x: number; y: number; at: number },
): boolean {
  return (
    down.pointers === 1 &&
    up.at - down.at <= TAP_MAX_MS &&
    Math.hypot(up.x - down.x, up.y - down.y) <= TAP_MAX_MOVE
  )
}

/** Pixels to scroll per frame while a dragged note is near the edge (negative = up). */
export function edgeScrollSpeed(
  y: number,
  top: number,
  bottom: number,
  zone = 64,
  max = 18,
): number {
  if (y < top + zone)
    return -Math.round(max * Math.min(1, (top + zone - y) / zone))
  if (y > bottom - zone)
    return Math.round(max * Math.min(1, (y - (bottom - zone)) / zone))
  return 0
}

/** One step that can be undone and done again. */
export interface StickyStep {
  undo: () => Promise<void>
  redo: () => Promise<void>
}

/** Undo and Redo of the sticky changes made in this reader. */
export class StickyHistory {
  private done: StickyStep[] = []
  private undone: StickyStep[] = []
  push(step: StickyStep): void {
    this.done.push(step)
    this.undone = []
  }
  get canUndo(): boolean {
    return this.done.length > 0
  }
  get canRedo(): boolean {
    return this.undone.length > 0
  }
  async undo(): Promise<boolean> {
    const s = this.done.pop()
    if (!s) return false
    await s.undo()
    this.undone.push(s)
    return true
  }
  async redo(): Promise<boolean> {
    const s = this.undone.pop()
    if (!s) return false
    await s.redo()
    this.done.push(s)
    return true
  }
}

/** Puts a new note on a page; returns it and the step that undoes it. */
export async function addSticky(
  db: LearningNotesDB,
  pageId: string,
  place: { page: number; x: number; y: number },
  note: string,
): Promise<{ annotation: Annotation; step: StickyStep }> {
  const annotation = await createAnnotation(db, {
    pageId,
    kind: 'sticky',
    anchor: stickyAnchor(place.page, place.x, place.y),
    note,
  })
  return {
    annotation,
    step: {
      undo: () => deleteAnnotation(db, annotation.id),
      redo: () => restoreAnnotation(db, annotation.id),
    },
  }
}

/** Changes the words of a note. */
export async function editSticky(
  db: LearningNotesDB,
  a: Annotation,
  note: string,
): Promise<StickyStep> {
  const before = a.note ?? ''
  await updateAnnotation(db, a.id, { note })
  return {
    undo: () => updateAnnotation(db, a.id, { note: before }),
    redo: () => updateAnnotation(db, a.id, { note }),
  }
}

export async function removeSticky(
  db: LearningNotesDB,
  a: Annotation,
): Promise<StickyStep> {
  await deleteAnnotation(db, a.id)
  return {
    undo: () => restoreAnnotation(db, a.id),
    redo: () => deleteAnnotation(db, a.id),
  }
}

/** Moves a note to a place on a page (also another page). */
export async function moveSticky(
  db: LearningNotesDB,
  a: Annotation,
  to: { page: number; x: number; y: number },
): Promise<StickyStep> {
  const from = a.anchor
  const next = stickyAnchor(to.page, to.x, to.y)
  const set = async (anchor: Annotation['anchor']) => {
    await db.annotations.update(a.id, { anchor, updatedAt: Date.now() })
  }
  await set(next)
  return { undo: () => set(from), redo: () => set(next) }
}
