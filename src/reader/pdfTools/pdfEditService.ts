import type { LearningNotesDB } from '../../core/db'
import type { InkChunk } from '../../core/inkTypes'
import type { Annotation, BookFile, Page } from '../../core/types'
import { getBookFile } from '../../library/libraryService'
import {
  fateMap,
  mapAnnotations,
  mapInk,
  mapSource,
  type PagePlan,
  type PageSize,
} from './pageOps'

/**
 * Saving a page edit (Q8): the new file replaces the book file, and everything
 * that points at a page (highlights, notes, bookmarks, ink, the reading place)
 * is moved, turned or removed in the SAME transaction, so a failure leaves the
 * book exactly as it was. What was there before is kept in `EditUndo` so one
 * Undo puts it all back.
 */

export interface EditUndo {
  pageId: string
  file: BookFile
  page: Page
  annotations: Annotation[]
  chunks: InkChunk[]
}

const toBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer

export async function applyPageEdit(
  db: LearningNotesDB,
  pageId: string,
  plan: PagePlan,
  sizes: readonly PageSize[],
  bytes: Uint8Array,
  now: number = Date.now(),
): Promise<EditUndo> {
  const fates = fateMap(plan)
  return db.transaction(
    'rw',
    db.pages,
    db.bookFiles,
    db.annotations,
    db.inkChunks,
    async () => {
      const page = await db.pages.get(pageId)
      const file = await getBookFile(db, pageId)
      if (!page?.source || !file) throw new Error('Book file not found')
      const annotations = await db.annotations
        .where('pageId')
        .equals(pageId)
        .toArray()
      const chunks = await db.inkChunks.where('pageId').equals(pageId).toArray()
      const undo: EditUndo = { pageId, file, page, annotations, chunks }

      await db.bookFiles.update(file.id, {
        data: toBuffer(bytes),
        size: bytes.byteLength,
        updatedAt: now,
      })
      for (const c of mapAnnotations(
        annotations.filter((a) => a.deletedAt === null),
        fates,
      )) {
        if (c.anchor) {
          await db.annotations.update(c.id, {
            anchor: c.anchor,
            updatedAt: now,
          })
        } else {
          await db.annotations.update(c.id, { deletedAt: now, updatedAt: now })
        }
      }
      for (const c of mapInk(
        chunks.filter((k) => k.deletedAt === null),
        fates,
        sizes,
      )) {
        if (c.blockId === null) {
          await db.inkChunks.update(c.id, { deletedAt: now, updatedAt: now })
        } else {
          await db.inkChunks.update(c.id, {
            blockId: c.blockId,
            ...(c.strokes ? { strokes: c.strokes } : {}),
            updatedAt: now,
          })
        }
      }
      await db.pages.update(pageId, {
        source: mapSource(page.source, fates, plan.length),
      })
      return undo
    },
  )
}

/** Puts the file, marks, ink and reading place back as they were. */
export async function undoPageEdit(
  db: LearningNotesDB,
  undo: EditUndo,
  now: number = Date.now(),
): Promise<void> {
  await db.transaction(
    'rw',
    db.pages,
    db.bookFiles,
    db.annotations,
    db.inkChunks,
    async () => {
      await db.bookFiles.put({ ...undo.file, updatedAt: now })
      await db.annotations.bulkPut(
        undo.annotations.map((a) => ({ ...a, updatedAt: now })),
      )
      await db.inkChunks.bulkPut(
        undo.chunks.map((c) => ({ ...c, updatedAt: now })),
      )
      const page = await db.pages.get(undo.pageId)
      if (page && undo.page.source) {
        await db.pages.update(undo.pageId, { source: undo.page.source })
      }
    },
  )
}
