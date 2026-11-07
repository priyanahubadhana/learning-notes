import type { Node as PMNode } from 'prosemirror-model'
import { TextSelection } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { miniToolbarOpen } from '../app/tools/main/mainTools'
import type { AppSchema } from './schema'

/**
 * The Lasso's T filter around PART of a paragraph (R6-17, owner's iPad). A
 * loop that does not take in most of a line used to select nothing. Now the
 * words whose centre lies inside the loop are found, across lines in reading
 * order, and the first to the last of them become one text selection with
 * the usual text menu. A line taken in whole still selects as a block (the
 * controller decides, from `blocks` here and its own "most of the line" rule).
 */

type Editor = AppSchema['BlockNoteEditor']

export interface WordsFound {
  from: number
  to: number
  /** The ids of the blocks that hold the chosen words, in page order. */
  blocks: string[]
  /** Those of them whose every word is inside: a whole line taken in. */
  full: string[]
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

const isWordChar = (ch: string) => /[\p{L}\p{N}_’'-]/u.test(ch)

/**
 * The words of one text block as document ranges (pure, tested): a word is a
 * run of letters, digits and the usual joins; an inline thing that is not
 * text (a mention, a break) splits words.
 */
export function wordRanges(block: PMNode, pos: number): [number, number][] {
  const chars: { ch: string; pos: number }[] = []
  block.forEach((child, offset) => {
    const at = pos + 1 + offset
    if (child.isText && child.text) {
      for (let i = 0; i < child.text.length; i++) {
        chars.push({ ch: child.text[i], pos: at + i })
      }
    } else {
      chars.push({ ch: ' ', pos: at })
    }
  })
  const out: [number, number][] = []
  let i = 0
  while (i < chars.length) {
    if (!isWordChar(chars[i].ch)) {
      i++
      continue
    }
    let j = i
    while (j < chars.length && isWordChar(chars[j].ch)) j++
    out.push([chars[i].pos, chars[j - 1].pos + 1])
    i = j
  }
  return out
}

/** The id of the page block (BlockNote container) that holds `pos`. */
function blockIdAt(doc: PMNode, pos: number): string | null {
  const $pos = doc.resolve(pos)
  for (let d = $pos.depth; d > 0; d--) {
    const node = $pos.node(d)
    if (node.type.name === 'blockContainer') {
      const id = (node.attrs as { id?: unknown }).id
      return typeof id === 'string' ? id : null
    }
  }
  return null
}

const overlaps = (r: DOMRect, b: Box) =>
  r.right >= b.x && r.left <= b.x + b.w && r.bottom >= b.y && r.top <= b.y + b.h

/**
 * The words whose centre is inside the region (client px), as one range from
 * the first to the last in reading order. `box` is the region's bounds: only
 * blocks and words that touch it are measured.
 */
export function wordsInRegion(
  view: Pick<EditorView, 'state' | 'nodeDOM' | 'coordsAtPos'>,
  inside: (x: number, y: number) => boolean,
  box: Box,
): WordsFound | null {
  const doc = view.state.doc
  let first: number | null = null
  let last = 0
  const blocks: string[] = []
  const full: string[] = []
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    if (node.content.size === 0) return false
    const el = view.nodeDOM(pos) as Element | null
    if (
      typeof el?.getBoundingClientRect === 'function' &&
      !overlaps(el.getBoundingClientRect(), box)
    ) {
      return false
    }
    const ranges = wordRanges(node, pos)
    let hits = 0
    for (const [from, to] of ranges) {
      const a = view.coordsAtPos(from, 1)
      const b = view.coordsAtPos(to, -1)
      const x = (a.left + b.left) / 2
      const y = (a.top + a.bottom) / 2
      if (x < box.x || x > box.x + box.w || y < box.y || y > box.y + box.h) {
        continue
      }
      if (!inside(x, y)) continue
      hits++
      if (first === null) first = from
      last = to
      const id = blockIdAt(doc, pos)
      if (id && !blocks.includes(id)) blocks.push(id)
      if (id && hits === ranges.length) full.push(id)
    }
    return false
  })
  return first === null ? null : { from: first, to: last, blocks, full }
}

/** Selects a text range as our own selection (drawn, kept) with the mini toolbar. */
export function selectTextRange(
  editor: Editor,
  from: number,
  to: number,
): void {
  const view = editor.prosemirrorView
  if (!view) return
  const d = view.state.doc
  if (to > d.content.size || from >= to) return
  view.dispatch(view.state.tr.setSelection(TextSelection.create(d, from, to)))
  try {
    const a = view.domAtPos(from)
    const h = view.domAtPos(to)
    view.dom.ownerDocument
      .getSelection()
      ?.setBaseAndExtent(a.node, a.offset, h.node, h.offset)
  } catch {
    // The editor's own selection is set; the browser copy is cosmetic.
  }
  miniToolbarOpen.set(true)
}
