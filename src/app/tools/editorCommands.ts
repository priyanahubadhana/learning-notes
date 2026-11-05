import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core'
import type { Editor } from '../../editor/barActions'
import { toggleBlank } from '../../editor/blankActions'
import { canMakeCard, makeCard } from '../../editor/cardActions'
import { runHistory } from '../../editor/historyActions'
import { addLineAfterCursor } from '../../editor/lineActions'
import { toggleMark } from '../../editor/markActions'
import {
  copyAs,
  copyPageWithPictures,
  pastePlainFromClipboard,
} from '../../editor/clipboard'
import type { AppActions, EditorExtras } from './toolRuntime'

/**
 * The editing tools that work on the open page, by tool id. The short bar,
 * the ribbon and the control panel all call these. (The bar's own buttons
 * keep their state, such as "Bold is on", from `useBarActions`.)
 */

export interface CommandContext {
  editor: Editor
  extras: EditorExtras | null
  app: AppActions | null
}

type Command = (c: CommandContext) => void

const TEXT_STYLES = ['bold', 'italic', 'underline', 'strike', 'code'] as const

/** The blocks a change applies to: the selected ones, or the cursor's. */
const targetBlocks = (editor: Editor) =>
  editor.getSelection()?.blocks ?? [editor.getTextCursorPosition().block]

/** Turns the blocks into `type`; a second use turns them back to text. */
function toggleBlockType(
  editor: Editor,
  type: string,
  props?: Record<string, unknown>,
) {
  const blocks = targetBlocks(editor)
  const same = blocks.every(
    (b) =>
      b.type === type &&
      Object.entries(props ?? {}).every(
        ([k, v]) => (b.props as Record<string, unknown>)[k] === v,
      ),
  )
  for (const block of blocks) {
    editor.updateBlock(
      block,
      (same ? { type: 'paragraph' } : { type, props }) as never,
    )
  }
  editor.focus()
}

function align(editor: Editor, alignment: 'left' | 'center' | 'right') {
  for (const block of targetBlocks(editor)) {
    if ('textAlignment' in block.props) {
      editor.updateBlock(block, {
        props: { textAlignment: alignment },
      } as never)
    }
  }
  editor.focus()
}

/** Adds the yellow highlight to the selected words, or takes it off. */
function toggleHighlight(editor: Editor) {
  const on =
    (editor.getActiveStyles() as Record<string, unknown>).backgroundColor ===
    'yellow'
  if (on) editor.removeStyles({ backgroundColor: 'yellow' } as never)
  else editor.addStyles({ backgroundColor: 'yellow' } as never)
  editor.focus()
}

/** Puts a new block under the cursor's line (on it, if the line is empty). */
function insertBlock(editor: Editor, block: { type: string }) {
  insertOrUpdateBlockForSlashMenu(editor, block as never)
  editor.focus()
}

const COMMANDS: Record<string, Command> = {
  ...Object.fromEntries(
    TEXT_STYLES.map((id) => [
      id,
      ({ editor }: CommandContext) => {
        editor.toggleStyles({ [id]: true } as never)
        editor.focus()
      },
    ]),
  ),
  highlight: ({ editor }) => toggleHighlight(editor),
  heading1: ({ editor }) => toggleBlockType(editor, 'heading', { level: 1 }),
  heading2: ({ editor }) => toggleBlockType(editor, 'heading', { level: 2 }),
  heading3: ({ editor }) => toggleBlockType(editor, 'heading', { level: 3 }),
  bulletList: ({ editor }) => toggleBlockType(editor, 'bulletListItem'),
  numberedList: ({ editor }) => toggleBlockType(editor, 'numberedListItem'),
  checklist: ({ editor }) => toggleBlockType(editor, 'checkListItem'),
  quote: ({ editor }) => toggleBlockType(editor, 'quote'),
  alignLeft: ({ editor }) => align(editor, 'left'),
  alignCenter: ({ editor }) => align(editor, 'center'),
  alignRight: ({ editor }) => align(editor, 'right'),
  indent: ({ editor }) => {
    editor.nestBlock()
    editor.focus()
  },
  outdent: ({ editor }) => {
    editor.unnestBlock()
    editor.focus()
  },
  undo: ({ editor }) => {
    runHistory(editor, 'undo')
  },
  redo: ({ editor }) => {
    runHistory(editor, 'redo')
  },
  newLine: ({ editor }) => addLineAfterCursor(editor),
  blank: ({ editor }) => {
    toggleBlank(editor)
    editor.focus()
  },
  card: ({ editor }) => {
    const block = editor.getTextCursorPosition().block
    if (!canMakeCard(block)) return
    makeCard(editor, block)
  },
  picture: ({ editor }) => insertBlock(editor, { type: 'image' }),
  callout: ({ editor }) => insertBlock(editor, { type: 'callout' }),
  divider: ({ editor }) => insertBlock(editor, { type: 'divider' }),
  pageLink: ({ extras }) => extras?.linkPage(),
  database: ({ extras }) => extras?.insertDatabase(),
  insertTemplate: ({ extras }) => extras?.insertTemplate(),
  saveTemplate: ({ extras }) => extras?.saveAsTemplate?.(),
  copyPlain: ({ editor, app }) =>
    void copyAs(editor, 'plain', app?.toast ?? (() => {})),
  copyMarkdown: ({ editor, app }) =>
    void copyAs(editor, 'markdown', app?.toast ?? (() => {})),
  copyPictures: ({ editor, app }) =>
    void copyPageWithPictures(editor, app?.toast ?? (() => {})),
  pastePlain: ({ editor, app }) =>
    void pastePlainFromClipboard(editor, app?.toast ?? (() => {})),
}

/** Revise mark buttons are `mark:<label>`. */
export function runEditorCommand(id: string, c: CommandContext): boolean {
  if (id.startsWith('mark:')) {
    toggleMark(c.editor, id.slice(5))
    c.editor.focus()
    return true
  }
  const command = COMMANDS[id]
  if (!command) return false
  command(c)
  return true
}

/** True for ids this file can run. */
export const isEditorCommand = (id: string): boolean =>
  id.startsWith('mark:') || id in COMMANDS
