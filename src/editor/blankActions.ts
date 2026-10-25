import { createId } from '../core/ids'
import type { AppSchema } from './schema'

/**
 * Fill-in-the-blank: selected words get the `blank` text style, whose value
 * is the blank's own id. Each blank becomes its own recall card (part = id),
 * so one sentence with three blanks makes three cards. Storing the blank as
 * marked text (not character positions) keeps it correct with emoji and any
 * script, and when the sentence is edited.
 */

type Editor = AppSchema['BlockNoteEditor']

/** Style name of a blank (see schema.tsx). */
export const BLANK_STYLE = 'blank'

/** Letters, digits and joiners inside words (any language). */
const WORD_CHAR = /[\p{L}\p{N}\p{M}_'’-]/u

/**
 * Widens a selection [from, to) in `text` to whole words, after dropping
 * spaces/punctuation at its edges. Returns an empty range if no word is
 * selected. E.g. selecting "rt of S" in "start of S1" gives "start of S1".
 */
export function snapToWords(
  text: string,
  from: number,
  to: number,
): [number, number] {
  const chars = Array.from(text) // by code point, so emoji stay whole
  // Convert string offsets (UTF-16) to code-point indexes.
  const toIndex = (offset: number) => Array.from(text.slice(0, offset)).length
  let a = toIndex(from)
  let b = toIndex(to)
  const isWord = (i: number) =>
    i >= 0 && i < chars.length && WORD_CHAR.test(chars[i])

  while (a < b && !isWord(a)) a++
  while (b > a && !isWord(b - 1)) b--
  if (a >= b) return [from, from]
  while (isWord(a - 1)) a--
  while (isWord(b)) b++

  const toOffset = (index: number) => chars.slice(0, index).join('').length
  return [toOffset(a), toOffset(b)]
}

/**
 * "Make blank" on the current selection, as one editor change (Ctrl+Z undoes
 * it). If the selection touches an existing blank, that blank is removed
 * instead. Returns what happened; false = nothing (no words selected, or the
 * selection spans several blocks).
 */
export function toggleBlank(editor: Editor): 'added' | 'removed' | false {
  return editor.transact((tr) => {
    const { from, to, $from, $to } = tr.selection
    const parent = $from.parent
    if (from === to || !$from.sameParent($to) || !parent.isTextblock) {
      return false
    }
    const blankMark = tr.doc.type.schema.marks[BLANK_STYLE]
    const start = $from.start()
    // Leaf nodes count as one character, so offsets match document positions.
    const text = parent.textBetween(0, parent.content.size, undefined, '￼')
    const [a, b] = snapToWords(text, from - start, to - start)
    if (a >= b) return false

    if (tr.doc.rangeHasMark(start + a, start + b, blankMark)) {
      // Remove every blank touched by the selection (whole blanks).
      const ids = new Set<string>()
      tr.doc.nodesBetween(start + a, start + b, (node) => {
        for (const mark of node.marks) {
          if (mark.type === blankMark) ids.add(String(mark.attrs.stringValue))
        }
      })
      parent.forEach((child, offset) => {
        for (const mark of child.marks) {
          if (
            mark.type === blankMark &&
            ids.has(String(mark.attrs.stringValue))
          ) {
            tr.removeMark(start + offset, start + offset + child.nodeSize, mark)
          }
        }
      })
      return 'removed'
    }

    tr.addMark(
      start + a,
      start + b,
      blankMark.create({ stringValue: createId() }),
    )
    return 'added'
  })
}
