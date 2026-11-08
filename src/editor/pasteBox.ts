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
  await db.transaction('rw', db.pages, db.notebooks, db.blocks, async () => {
    boxId =
      narrow || !spot
        ? await addBoxInOrder(db, host.pageId, host.boxId || MAIN_BOX)
        : await addBox(db, host.pageId, spot)
    const made = await addBlocks(db, host.pageId, blocks.map(toInput))
    const top = made.filter((b) => b.parentId === null).map((b) => b.id)
    await db.blocks.where('id').anyOf(top).modify({ boxId })
  })
  return async () => {
    await removeBox(db, host.pageId, boxId)
  }
}
