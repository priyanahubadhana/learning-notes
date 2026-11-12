import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import {
  identityPlan,
  insertBlank,
  movePage,
  removePages,
  turnPages,
  type PagePlan,
} from '../pdfTools/pageOps'
import { applyPlan, pageSizesOf } from '../pdfTools/pdfEdit'
import { applyPageEdit, type EditUndo } from '../pdfTools/pdfEditService'
import { getBookFile } from '../../library/libraryService'

/**
 * Pages grid edits (slice 7f, RD-B36 to RD-B40). Each edit is one plan over
 * the book as it is now; the real file, highlights, notes, bookmarks, ink and
 * reading place follow in ONE transaction (applyPageEdit). The first edit
 * also keeps the first copy of the book (`BookFile.original`, device only,
 * up to 200 MB) so "Restore original" works.
 *
 * This file loads pdf-lib: it is imported only when an edit is made.
 */

/** Pages are numbered 1 to n; `at`, `from`, `to`, `after` are page numbers. */
export type PageOp =
  | { kind: 'move'; from: number; to: number }
  | { kind: 'delete'; at: number }
  | { kind: 'turn'; at: number; by: 90 | -90 }
  | { kind: 'blank'; after: number }

/** The plan for one edit of a book with `count` pages, or null when it changes nothing or is not allowed. */
export function planFor(count: number, op: PageOp): PagePlan | null {
  const plan = identityPlan(count)
  const inside = (n: number) => Number.isInteger(n) && n >= 1 && n <= count
  switch (op.kind) {
    case 'move':
      if (!inside(op.from) || !inside(op.to) || op.from === op.to) return null
      return movePage(plan, op.from - 1, op.to - 1)
    case 'delete':
      // A book keeps at least one page.
      if (!inside(op.at) || count < 2) return null
      return removePages(plan, [op.at - 1])
    case 'turn':
      if (!inside(op.at)) return null
      return turnPages(plan, [op.at - 1], op.by)
    case 'blank':
      if (op.after < 0 || op.after > count) return null
      return insertBlank(plan, op.after - 1)
  }
}

/** The toast that goes with an edit (the Undo button is added by the caller). */
export function doneText(op: PageOp): string {
  switch (op.kind) {
    case 'move':
      return t('readerv2.pages.moved', { n: op.from })
    case 'delete':
      return t('readerv2.pages.deleted', { n: op.at })
    case 'turn':
      return t('readerv2.pages.turned', { n: op.at })
    case 'blank':
      return t('readerv2.pages.blankAdded', { n: op.after })
  }
}

const message = () => t('pdftools.err.open')

/** Applies one edit to the stored book. Returns what Undo needs. */
export async function runPageEdit(
  db: LearningNotesDB,
  pageId: string,
  data: ArrayBuffer,
  plan: PagePlan,
): Promise<EditUndo> {
  // Ink not yet written is saved first, so it moves with its page.
  const { flushAllInk } = await import('../../ink/inkDoc')
  await flushAllInk()
  const sizes = await pageSizesOf(data, message())
  const bytes = await applyPlan(data, plan, message())
  return applyPageEdit(db, pageId, plan, sizes, bytes, Date.now(), {
    keepOriginal: true,
  })
}

/**
 * "Restore original": the first copy comes back. Marks stay where their page
 * still exists (the original's page count); one Undo puts the edits back.
 */
export async function restoreOriginal(
  db: LearningNotesDB,
  pageId: string,
  data: ArrayBuffer,
): Promise<EditUndo> {
  const file = await getBookFile(db, pageId)
  if (!file?.original) throw new Error('No first copy')
  const { flushAllInk } = await import('../../ink/inkDoc')
  await flushAllInk()
  const back = file.original
  const count = (await pageSizesOf(back, message())).length
  const sizes = await pageSizesOf(data, message())
  return applyPageEdit(
    db,
    pageId,
    identityPlan(count),
    sizes,
    new Uint8Array(back),
  )
}
