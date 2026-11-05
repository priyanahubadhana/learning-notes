import type { Editor } from '../../../editor/barActions'

/**
 * What the Aa pill and its cards do to the page: set (not toggle) a text
 * style, a list kind or an alignment, and read what the cursor is in.
 */

export const TEXT_STYLES = ['title', 'h1', 'h2', 'h3', 'body'] as const
export type TextStyleId = (typeof TEXT_STYLES)[number]
export const LIST_KINDS = ['bullets', 'numbers', 'checklist', 'toggle'] as const
export type ListKind = (typeof LIST_KINDS)[number]
export const ALIGNS = ['left', 'center', 'right', 'justify'] as const
export type AlignId = (typeof ALIGNS)[number]

/** The blocks a change applies to: the selected ones, or the cursor's. */
const targets = (editor: Editor) =>
  editor.getSelection()?.blocks ?? [editor.getTextCursorPosition().block]

/**
 * Title is the biggest heading, centred (the editor has no separate Title
 * block); Heading 1 is the same size, left. See DECISIONS.
 */
export function styleOf(block: {
  type: string
  props: Record<string, unknown>
}): TextStyleId | 'other' {
  if (block.type === 'paragraph') return 'body'
  if (block.type !== 'heading') return 'other'
  const level = block.props.level
  if (level === 1)
    return block.props.textAlignment === 'center' ? 'title' : 'h1'
  return level === 2 ? 'h2' : level === 3 ? 'h3' : 'other'
}

export function setStyle(editor: Editor, style: TextStyleId): void {
  for (const block of targets(editor)) {
    if (style === 'body') {
      editor.updateBlock(block, { type: 'paragraph' } as never)
      continue
    }
    const level = style === 'h2' ? 2 : style === 'h3' ? 3 : 1
    editor.updateBlock(block, {
      type: 'heading',
      props: {
        level,
        textAlignment: style === 'title' ? 'center' : 'left',
      },
    } as never)
  }
  editor.focus()
}

const LIST_TYPE: Record<Exclude<ListKind, 'toggle'>, string> = {
  bullets: 'bulletListItem',
  numbers: 'numberedListItem',
  checklist: 'checkListItem',
}

/** The list the cursor is in, if any. */
export function listOf(type: string): ListKind | null {
  for (const [kind, name] of Object.entries(LIST_TYPE)) {
    if (name === type) return kind as ListKind
  }
  return null
}

/** Makes the blocks a list of this kind; the same kind again turns it off. */
export function setList(
  editor: Editor,
  kind: Exclude<ListKind, 'toggle'>,
): void {
  const blocks = targets(editor)
  const same = blocks.every((b) => b.type === LIST_TYPE[kind])
  for (const block of blocks) {
    editor.updateBlock(
      block,
      (same ? { type: 'paragraph' } : { type: LIST_TYPE[kind] }) as never,
    )
  }
  editor.focus()
}

export function setAlign(editor: Editor, align: AlignId): void {
  for (const block of targets(editor)) {
    if ('textAlignment' in block.props) {
      editor.updateBlock(block, { props: { textAlignment: align } } as never)
    }
  }
  editor.focus()
}

export function alignOf(block: { props: Record<string, unknown> }): AlignId {
  const a = block.props.textAlignment
  return (ALIGNS as readonly unknown[]).includes(a) ? (a as AlignId) : 'left'
}
