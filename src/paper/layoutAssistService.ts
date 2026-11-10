import type { LearningNotesDB } from '../core/db'
import { getLive, isLive } from '../core/records'
import type { GridRow, Page, PaperBox } from '../core/types'
import { recordVersion } from '../history/versionService'
import { boxesOf, MAIN_BOX, MARGIN, sheetOf, TOP } from './boxes'
import {
  clampBox,
  restoreGrid,
  type BoxPatch,
  type GridBefore,
} from './boxService'
import { layoutRows, migrateToRows, reconcile } from './grid'
import { arrangeAll } from './layoutPlan'

/**
 * Layout Assist writes (bug batch 2, items 7 and 10): one transaction per
 * page, which returns what it replaced so one Undo puts everything back.
 */

const copyBefore = (page: Page): GridBefore => ({
  rows: page.rows?.map((r) => ({
    ...r,
    cols: r.cols.map((c) => ({ ...c, boxIds: [...c.boxIds] })),
  })),
  boxes: page.boxes?.map((b) => ({ ...b })),
})

/**
 * Writes the finished layout of one page: the new rows, the places they give
 * the boxes (for old clients) and the boxes made for "+ New box" zones
 * (`fresh`, placed by `places`). Nothing else is created or deleted.
 */
export async function applyLayout(
  db: LearningNotesDB,
  pageId: string,
  rows: readonly GridRow[],
  places: readonly BoxPatch[],
  fresh: readonly string[],
): Promise<GridBefore> {
  const first = await getLive(db.pages, pageId)
  if (!first.rows) await recordVersion(db, pageId, { force: true })
  return db.transaction('rw', db.pages, async () => {
    const page = await getLive(db.pages, pageId)
    const sheet = sheetOf(page)
    const before = copyBefore(page)
    const stored = new Map((page.boxes ?? []).map((b) => [b.id, b]))
    const at = new Map(places.map((p) => [p.id, p.patch]))
    for (const id of fresh) {
      const p = at.get(id)
      stored.set(
        id,
        clampBox(
          { id, x: p?.x ?? MARGIN, y: p?.y ?? TOP, w: p?.w ?? 90 },
          sheet.w,
        ),
      )
    }
    for (const { id, patch } of places) {
      const cur = stored.get(id)
      if (cur && id !== MAIN_BOX && !fresh.includes(id) && !cur.locked)
        stored.set(id, clampBox({ ...cur, ...patch }, sheet.w))
    }
    const boxes = [...stored.values()]
    await db.pages.update(pageId, {
      boxes: boxes.length ? boxes : undefined,
      rows: reconcile(rows, [
        MAIN_BOX,
        ...boxes.filter((b) => b.id !== MAIN_BOX).map((b) => b.id),
      ]),
      updatedAt: Date.now(),
    })
    return before
  })
}

/** The live pages of a notebook that the layout can change (they hold boxes). */
export async function notebookPages(
  db: LearningNotesDB,
  notebookId: string,
): Promise<Page[]> {
  return (await db.pages.where('notebookId').equals(notebookId).toArray())
    .filter(isLive)
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
}

/** The boxes of a page and the rows it has now (or would have, when migrated). */
export function pageRows(page: Page): GridRow[] {
  const boxes = boxesOf(page)
  return page.rows
    ? reconcile(
        page.rows,
        boxes.map((b) => b.id),
      )
    : migrateToRows(boxes, {})
}

/** Estimated geometry of a page the person is not looking at (no measured heights). */
export function guessGeometry(page: Page) {
  const s = sheetOf(page)
  return {
    sheetW: s.w,
    sheetH: s.h,
    gapMm: 8,
    left: MARGIN,
    right: MARGIN,
    top: TOP,
    bottom: MARGIN,
  }
}

/** What a layout would make of each page of a notebook (item 10's preview). */
export function planNotebook(pages: readonly Page[], presetId: string) {
  return pages.map((page) => ({
    page,
    rows: arrangeAll(pageRows(page), presetId),
  }))
}

/**
 * Applies the layout to every page that has boxes besides its own text. One
 * Undo restores all of them. Returns what each page had, or [] if none changed.
 */
export async function applyNotebook(
  db: LearningNotesDB,
  notebookId: string,
  presetId: string,
): Promise<{ pageId: string; before: GridBefore }[]> {
  const out: { pageId: string; before: GridBefore }[] = []
  for (const { page, rows } of planNotebook(
    await notebookPages(db, notebookId),
    presetId,
  )) {
    if (
      !rows ||
      (page.boxes ?? []).filter((b) => b.id !== MAIN_BOX).length === 0
    )
      continue
    const geo = guessGeometry(page)
    const lay = layoutRows(rows, {}, geo)
    const places: BoxPatch[] = []
    for (const [id, r] of lay)
      if (id !== MAIN_BOX)
        places.push({ id, patch: { x: r.x, y: r.y, w: r.w } })
    out.push({
      pageId: page.id,
      before: await applyLayout(db, page.id, rows, places, []),
    })
  }
  return out
}

/** Undo of `applyNotebook`. */
export async function restoreNotebook(
  db: LearningNotesDB,
  all: readonly { pageId: string; before: GridBefore }[],
): Promise<void> {
  for (const { pageId, before } of all) await restoreGrid(db, pageId, before)
}

export type { PaperBox }
