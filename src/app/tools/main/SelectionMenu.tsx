import { useEffect, useReducer } from 'react'
import { t, type MessageKey } from '../../../i18n/t'
import { copyAs } from '../../../editor/clipboard'
import type { Editor } from '../../../editor/barActions'
import { runEditorCommand } from '../editorCommands'
import { Icon, type IconName } from '../icons'
import { currentRunner } from '../toolRuntime'
import { runTool } from '../toolRegistry'
import type { CardAnchor } from './pillPlace'
import { keepFocus } from './pillKit'
import { miniToolbarOpen } from './mainTools'

/**
 * What the Lasso offers once something is selected. On text and pictures it
 * works now (Copy, Cut, Duplicate, Delete, Colour, Key point, Make card).
 * Move, scale, rotate, Screenshot, Save to notes and Convert handwriting need
 * the drawing engine and the shared ink layers (step 3): they show dimmed and
 * say so.
 */

interface Item {
  id: string
  icon: IconName
  run?: () => void
}

type Block = ReturnType<Editor['getTextCursorPosition']>['block']

/** The selection as blocks (several), the cursor block, or null (no selection). */
function selected(editor: Editor): { blocks: Block[]; text: boolean } | null {
  const range = editor.getSelection()
  const text = editor.getSelectedText().length > 0
  // Several blocks: the whole blocks.
  if (range && range.blocks.length > 1) {
    return { blocks: range.blocks as Block[], text: false }
  }
  // Words inside one block: just the words.
  if (text)
    return { blocks: [editor.getTextCursorPosition().block], text: true }
  // A picture (or another block with no text): the block.
  if (range) return { blocks: range.blocks as Block[], text: false }
  return null
}

/** A copy of a block without ids, so the editor gives the copy its own. */
type Plain = {
  type: string
  props: unknown
  content: unknown
  children: Plain[]
}
const strip = (b: Block): Plain => ({
  type: b.type,
  props: b.props,
  content: b.content,
  children: (b.children as Block[]).map(strip),
})

export function SelectionMenu({
  editor,
  anchor,
}: {
  editor: Editor
  anchor: CardAnchor
}) {
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const off1 = editor.onSelectionChange(redraw)
    const off2 = editor.onChange(redraw)
    return () => {
      off1?.()
      off2?.()
    }
  }, [editor])
  const sel = selected(editor)
  // The mini toolbar covers a tap selection of words.
  if (!sel || (sel.text && miniToolbarOpen.get())) return null
  const toast = (m: string) => currentRunner().app?.toast(m)
  const coming = () => toast(t('main.coming.ink'))

  const cut = async () => {
    await copyAs(editor, 'plain', toast)
    remove()
  }
  const remove = () => {
    const s = selected(editor)
    if (!s) return
    if (!s.text) editor.removeBlocks(s.blocks)
    else editor.insertInlineContent([])
    editor.focus()
  }
  const duplicate = () => {
    const s = selected(editor)
    if (!s) return
    const last = s.blocks[s.blocks.length - 1]
    editor.insertBlocks(s.blocks.map(strip) as never, last, 'after')
  }
  const items: Item[] = [
    {
      id: 'copy',
      icon: 'copy',
      run: () => void copyAs(editor, 'plain', toast),
    },
    { id: 'cut', icon: 'scissors', run: () => void cut() },
    { id: 'duplicate', icon: 'duplicate', run: duplicate },
    { id: 'delete', icon: 'trash', run: remove },
    {
      id: 'colour',
      icon: 'palette',
      run: () => currentRunner().bar?.openPanel('color'),
    },
    { id: 'move', icon: 'move' },
    { id: 'scale', icon: 'scale' },
    { id: 'rotate', icon: 'rotate' },
    { id: 'screenshot', icon: 'screenshot' },
    {
      id: 'keyPoint',
      icon: 'star',
      run: () => {
        const r = currentRunner()
        runEditorCommand('mark:key', { editor, extras: r.extras, app: r.app })
      },
    },
    { id: 'makeCard', icon: 'cards', run: () => runTool('card') },
    { id: 'saveToNotes', icon: 'notebook' },
    { id: 'convert', icon: 'type' },
  ]
  return (
    <div
      role="toolbar"
      aria-label={t('main.sel.label')}
      data-pill-root
      data-selection-menu
      style={{
        left: anchor.left,
        top: anchor.top,
        bottom: anchor.bottom,
        width: Math.min(340, window.innerWidth - 16),
      }}
      className="fixed z-[45] flex flex-wrap gap-0.5 rounded-2xl border border-ink-soft bg-bg p-1 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.2)]"
    >
      {items.map((item) => {
        const label = t(`main.sel.${item.id}` as MessageKey)
        const later = !item.run
        return (
          <button
            key={item.id}
            type="button"
            data-sel={item.id}
            data-coming={later ? '' : undefined}
            aria-label={label}
            title={later ? `${label}. ${t('main.coming.ink')}` : label}
            onMouseDown={keepFocus}
            onClick={later ? coming : item.run}
            className="grid min-h-11 min-w-11 place-items-center rounded-xl text-ink-soft hover:bg-hover hover:text-ink data-[coming]:opacity-55"
          >
            <Icon name={item.icon} />
          </button>
        )
      })}
    </div>
  )
}
