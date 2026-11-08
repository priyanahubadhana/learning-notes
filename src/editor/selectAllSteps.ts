import { AllSelection, TextSelection } from 'prosemirror-state'
import { CellSelection } from 'prosemirror-tables'
import type { Node as PmNode } from 'prosemirror-model'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/**
 * Ctrl/Cmd+A steps outward, like Notion: 1st the words of the current cell
 * or block, 2nd the whole table (in a table) or all blocks of this box, 3rd
 * the whole page (every box's blocks; on a one-box page the 2nd or 3rd press
 * changes nothing more). Returns true when it took the key.
 */
export function selectAllStep(editor: Editor): boolean {
  const view = editor.prosemirrorView
  if (!view) return false
  const { state } = view
  const sel = state.selection
  const doc = state.doc
  const covers = (from: number, to: number) => sel.from <= from && sel.to >= to
  const all = new AllSelection(doc)
  const select = (s: typeof sel) => view.dispatch(state.tr.setSelection(s))

  if (sel instanceof AllSelection) {
    selectPage(editor)
    return true
  }
  const $from = sel.$from
  let tableDepth = -1
  let cellDepth = -1
  for (let d = $from.depth; d > 0; d--) {
    const role = $from.node(d).type.spec.tableRole
    if (role === 'cell' || role === 'header_cell') cellDepth = d
    if (role === 'table') {
      tableDepth = d
      break
    }
  }
  if (tableDepth >= 0) {
    const table = $from.node(tableDepth)
    const tableStart = $from.start(tableDepth)
    const cellsAt = cellPositions(table, tableStart)
    const whole =
      sel instanceof CellSelection &&
      cellsAt.length > 0 &&
      sel.$anchorCell.pos === cellsAt[0] &&
      sel.$headCell.pos === cellsAt[cellsAt.length - 1]
    if (whole) {
      select(all)
      return true
    }
    if (sel instanceof CellSelection) {
      selectTable(select, state.doc, cellsAt)
      return true
    }
    const inCell = cellDepth >= 0
    const from = inCell ? $from.start(cellDepth) + 1 : $from.start()
    const to = inCell ? $from.end(cellDepth) - 1 : $from.end()
    if (inCell && !covers(from, to)) {
      select(TextSelection.create(doc, from, to))
      return true
    }
    selectTable(select, state.doc, cellsAt)
    return true
  }

  // A text block: its words, then every block of this box, then the page.
  const from = $from.start()
  const to = $from.end()
  if (!sel.empty || to > from) {
    if (!covers(from, to)) {
      select(TextSelection.create(doc, from, to))
      return true
    }
  }
  select(all)
  return true
}

function cellPositions(table: PmNode, tableStart: number): number[] {
  const out: number[] = []
  table.descendants((node, pos) => {
    const role = node.type.spec.tableRole
    if (role === 'cell' || role === 'header_cell') {
      out.push(tableStart + pos)
      return false
    }
    return true
  })
  return out
}

function selectTable(
  select: (s: CellSelection) => void,
  doc: PmNode,
  cells: number[],
): void {
  if (cells.length === 0) return
  select(CellSelection.create(doc, cells[0], cells[cells.length - 1]))
}

/**
 * Third step on a page with several boxes: one browser selection from the
 * first box's start to the last box's end, so Copy takes everything (tables
 * stay tables). Returns false when the page has a single box.
 */
function selectPage(editor: Editor): boolean {
  const own = editor.domElement
  const page = own?.closest('[data-page-scroller], main') ?? document
  const boxes = [...page.querySelectorAll('.bn-editor')]
  if (boxes.length < 2) return false
  const first = boxes[0]
  const last = boxes[boxes.length - 1]
  const s = window.getSelection()
  s?.setBaseAndExtent(first, 0, last, last.childNodes.length)
  return true
}

/** Key handler: Ctrl/Cmd+A, no other modifier. */
export function onSelectAllKey(editor: Editor, e: KeyboardEvent): void {
  if (e.key.toLowerCase() !== 'a' || e.shiftKey || e.altKey) return
  if (!(e.ctrlKey || e.metaKey)) return
  if (selectAllStep(editor)) e.preventDefault()
}
