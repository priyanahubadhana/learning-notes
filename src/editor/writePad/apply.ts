import type { Mark, Node } from 'prosemirror-model'
import { TextSelection } from 'prosemirror-state'
import type { Editor } from '../barActions'
import { encodeHand, HAND_STYLE, isPlainLook, type HandLook } from './handStyle'

/** How the written text looks: the hand look plus BlockNote colour names. */
export interface PadLook extends HandLook {
  /** BlockNote colour name ("default" = none). */
  color: string
  highlight: string
}

/**
 * Puts the pad's text into the editor as ONE change (a single Undo step):
 * "insert" at the saved cursor, "replace" over the saved selection. The text
 * is plain text with marks (hand look, colour, highlight), so it is searched,
 * saved, synced and exported like anything typed. Returns where the cursor is
 * afterwards (the next piece goes there), or null when nothing was done.
 */
export function applyPad(
  editor: Editor,
  text: string,
  look: PadLook,
  mode: 'insert' | 'replace',
  saved: { from: number; to: number },
): number | null {
  if (text.length === 0) return null
  return editor.transact((tr) => {
    const size = tr.doc.content.size
    const at = (n: number) => Math.max(0, Math.min(size, n))
    const range = TextSelection.between(
      tr.doc.resolve(at(saved.from)),
      tr.doc.resolve(at(saved.to)),
    )
    const from = range.from
    let to = mode === 'insert' ? from : range.to
    const { schema } = tr.doc.type
    const marks: Mark[] = []
    if (!isPlainLook(look) && schema.marks[HAND_STYLE]) {
      marks.push(
        schema.marks[HAND_STYLE].create({ stringValue: encodeHand(look) }),
      )
    }
    if (look.color !== 'default' && schema.marks.textColor) {
      marks.push(schema.marks.textColor.create({ stringValue: look.color }))
    }
    if (look.highlight !== 'default' && schema.marks.backgroundColor) {
      marks.push(
        schema.marks.backgroundColor.create({ stringValue: look.highlight }),
      )
    }
    // Lines of the pad become line breaks inside the same block.
    const lineBreak = schema.nodes.hardBreak
    const nodes: Node[] = []
    text.split('\n').forEach((line, i) => {
      if (i > 0) nodes.push(lineBreak ? lineBreak.create() : schema.text(' '))
      if (line) nodes.push(schema.text(line, marks))
    })
    const $from = tr.doc.resolve(from)
    if (!$from.parent.isTextblock || !$from.sameParent(tr.doc.resolve(to))) {
      // A selection across blocks: remove it, then write at its start.
      tr.delete(from, to)
      to = from
    }
    tr.replaceWith(from, to, nodes)
    const end = Math.min(tr.mapping.map(to, 1), tr.doc.content.size)
    tr.setSelection(TextSelection.near(tr.doc.resolve(end), -1))
    return tr.selection.to
  })
}
