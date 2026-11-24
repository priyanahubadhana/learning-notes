import { addBlocks, type BlockInput } from '../core/blockBulk'
import type { LearningNotesDB } from '../core/db'
import type { JsonObject } from '../core/types'
import { activeBox } from '../paper/activeBox'
import { MARGIN, SHEETS } from '../paper/boxes'
import {
  MIN_W,
  NEW_W,
  addBox,
  addBoxInOrder,
  removeBox,
} from '../paper/boxService'
import { MAIN_BOX } from '../paper/boxes'
import { isOn } from '../app/flags'
import { FREE_MIN_W, ROW_GAP } from '../paper/grid'
import type { AppSchema } from './schema'

/**
 * "As text box" on paper pages: the pasted content goes into a NEW box at the
 * paste spot instead of the line the caret is in. This only calls the paper's
 * own box API (addBox, addBoxInOrder, removeBox); nothing in src/paper is
 * changed. The spot is the caret's place on the sheet, read from the page.
 */

type Editor = AppSchema['BlockNoteEditor']
type EditorBlock = {
  type: string
  props?: Record<string, unknown>
  content?: unknown
  children?: EditorBlock[]
}

/** Widest a pasted box starts out, in mm. */
const BOX_W = 120

export interface BoxHost {
  pageId: string
  /** The box the caret is in (`main` for the default one). */
  boxId: string
  sheetEl: HTMLElement
}

/** The paper page this editor is on, or null (no paper around it). */
export function boxHost(editor: Editor): BoxHost | null {
  const dom = editor.domElement
  const sheetEl = dom?.closest<HTMLElement>('[data-paper]')
  const active = activeBox.get()
  if (!sheetEl || !active) return null
  return { pageId: active.pageId, boxId: active.boxId, sheetEl }
}

/** The caret's place on the sheet in mm: x at the caret, y just under its line. */
export function caretSpot(
  editor: Editor,
  host: BoxHost,
): { x: number; y: number; w: number } | null {
  const sheet =
    SHEETS[host.sheetEl.dataset.sheet === 'Letter' ? 'Letter' : 'A4']
  const paper = host.sheetEl.getBoundingClientRect()
  if (paper.width <= 0) return null
  const k = paper.width / sheet.w
  const sel = window.getSelection()
  let rect: DOMRect | null = null
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0).getClientRects()[0]
    if (r && (r.width || r.height)) rect = r
  }
  if (!rect) {
    // An empty line has no text rectangle: use the cursor block's own.
    const id = editor.getTextCursorPosition().block.id
    const el = editor.domElement?.querySelector(`[data-id="${CSS.escape(id)}"]`)
    rect = el?.getBoundingClientRect() ?? null
  }
  if (!rect) return null
  const w = Math.min(BOX_W, sheet.w - 2 * MARGIN)
  const x = Math.min(
    Math.max(MARGIN, (rect.left - paper.left) / k),
    sheet.w - MARGIN - Math.max(MIN_W, Math.min(w, NEW_W)),
  )
  const y = (rect.bottom - paper.top) / k + 2
  return { x, y, w: Math.max(MIN_W, Math.min(w, sheet.w - MARGIN - x)) }
}

/**
 * C28 (text box v2): the box goes in as a free box at the paste spot, as wide
 * as the free paper to the next box on its right allows, in the row order of
 * the page (rows whose top is above the spot come first). Reads the boxes'
 * places from the sheet.
 */
function freePlace(
  host: BoxHost,
  spot: { x: number; y: number; w: number },
  rows: { cols: { boxIds: string[] }[] }[],
): { wmm: number; row: number } {
  const sheet =
    SHEETS[host.sheetEl.dataset.sheet === 'Letter' ? 'Letter' : 'A4']
  const paper = host.sheetEl.getBoundingClientRect()
  const k = paper.width / sheet.w
  const top = new Map<string, number>()
  let wmm = spot.w
  for (const el of host.sheetEl.querySelectorAll<HTMLElement>(
    '[data-paper-box]',
  )) {
    const r = el.getBoundingClientRect()
    const id = el.dataset.paperBox ?? ''
    const t = (r.top - paper.top) / k
    top.set(id, t)
    // A box to the right that overlaps the new box's lines limits its width.
    const left = (r.left - paper.left) / k
    const overlaps = r.bottom - paper.top > spot.y * k && t < spot.y + 8
    if (id !== host.boxId && overlaps && left > spot.x)
      wmm = Math.min(wmm, left - spot.x - ROW_GAP)
  }
  const row = rows.filter(
    (r) =>
      Math.min(
        ...r.cols.flatMap((c) => c.boxIds).map((id) => top.get(id) ?? 1e9),
      ) <= spot.y,
  ).length
  return { wmm: Math.max(FREE_MIN_W + 24, wmm), row }
}

/** A BlockNote block as the storable input of `addBlocks`. */
export function toInput(block: EditorBlock): BlockInput {
  const content: Record<string, unknown> = { ...(block.props ?? {}) }
  if (block.content !== undefined) content.text = block.content
  return {
    type: block.type,
    content: JSON.parse(JSON.stringify(content)) as JsonObject,
    children: block.children?.map(toInput),
  }
}

/**
 * Makes a box at the paste spot holding `blocks`. Returns a function that
 * takes it away again (the toast's Undo), or null when the paper has no room
 * for it (no sheet found).
 */
export async function pasteIntoNewBox(
  db: LearningNotesDB,
  editor: Editor,
  blocks: readonly EditorBlock[],
): Promise<(() => Promise<void>) | null> {
  const host = boxHost(editor)
  if (!host || blocks.length === 0) return null
  const spot = caretSpot(editor, host)
  const narrow = getComputedStyle(host.sheetEl).display === 'flex'
  let boxId = ''
  await db.transaction(
    'rw',
    db.pages,
    db.notebooks,
    db.blocks,
    db.settings,
    async () => {
      const page = await db.pages.get(host.pageId)
      boxId =
        narrow || !spot
          ? await addBoxInOrder(db, host.pageId, host.boxId || MAIN_BOX)
          : isOn('textbox.v2') && page?.rows
            ? await addBox(db, host.pageId, {
                x: spot.x,
                y: spot.y,
                free: true,
                ...freePlace(host, spot, page.rows),
              })
            : await addBox(db, host.pageId, spot)
      const made = await addBlocks(db, host.pageId, blocks.map(toInput))
      const top = made.filter((b) => b.parentId === null).map((b) => b.id)
      await db.blocks.where('id').anyOf(top).modify({ boxId })
    },
  )
  return async () => {
    await removeBox(db, host.pageId, boxId)
  }
}
