import { useBlockNoteEditor } from '@blocknote/react'
import { useCallback } from 'react'
import { t, type MessageKey } from '../../../i18n/t'
import { copyAs, pastePlainFromClipboard } from '../../../editor/clipboard'
import type { Editor } from '../../../editor/barActions'
import {
  pictureControl,
  type PictureAction,
} from '../../../editor/pictureControl'
import { deselect } from '../../../editor/ownSelection'
import { inkFor, useInk } from '../../../ink/inkRuntime'
import { useUnlocked } from '../../../settings/level'
import { runEditorCommand } from '../editorCommands'
import { Icon } from '../icons'
import { miniToolbarOpen } from '../main/mainTools'
import { selected, strip } from '../main/selectionOps'
import { useEditorRedraw } from '../main/useEditorRedraw'
import { runTool } from '../toolRegistry'
import { currentRunner } from '../toolRuntime'
import { barItems, moreItems } from './selectionBarModel'
import './cards/toolCards.css'

/**
 * The selection bar (toolbar.v8, TB-33, TB-34): one wrapping row under the
 * tool row, shown while the Lasso has words or a picture selected. It runs
 * the same actions as today's selection menu (SelectionMenu.tsx); drawings
 * keep their own menu (ink/InkSurface.tsx).
 */

/** Actions that only work on drawings or are still to come: shown dimmed. */
const DIM = new Set(['resize', 'screenshot', 'move', 'scale', 'rotate'])
const SOON = new Set(['convert'])
const PICTURE_SAME = new Set(['cut', 'copy', 'duplicate', 'delete', 'deselect'])

function useSelActions(editor: Editor) {
  const toast = (m: string) => currentRunner().app?.toast(m)
  return useCallback(
    (id: string) => {
      const say = (key: MessageKey) => toast(t(key))
      const remove = () => {
        const s = selected(editor)
        if (!s) return
        if (!s.text) editor.removeBlocks(s.blocks)
        else editor.insertInlineContent([])
        editor.focus()
      }
      // A selected picture has its own actions (the picture strip's).
      const pic = pictureControl.get()
      if (pic && PICTURE_SAME.has(id)) return pic.run(id as PictureAction)
      switch (id) {
        case 'cut':
          void copyAs(editor, 'all', toast, undefined, true).then(remove)
          break
        case 'copy':
          void copyAs(editor, 'all', toast)
          break
        case 'paste':
          void pastePlainFromClipboard(editor, toast)
          break
        case 'duplicate': {
          const s = selected(editor)
          if (!s) break
          const last = s.blocks[s.blocks.length - 1]
          editor.insertBlocks(s.blocks.map(strip) as never, last, 'after')
          break
        }
        case 'delete':
          remove()
          break
        case 'colour':
          currentRunner().bar?.openPanel('color')
          break
        case 'deselect':
          deselect(editor)
          break
        case 'keyPoint': {
          const r = currentRunner()
          runEditorCommand('mark:key', { editor, extras: r.extras, app: r.app })
          break
        }
        case 'makeCard':
          runTool('card')
          break
        case 'summary':
          runTool('summary')
          break
        case 'saveToNotes': {
          const text = editor.getSelectedText()
          if (text.trim() === '') say('ink.sel.textOnly')
          else inkFor(editor)?.saveText(text)
          break
        }
        default:
          say(SOON.has(id) ? 'main.coming.later' : 'ink.sel.textOnly')
      }
    },
    [editor],
  )
}

/** True when the bar should show: words or a picture are selected. */
function useHasSelection(editor: Editor, lasso: boolean): boolean {
  useEditorRedraw(editor)
  const ink = useInk()
  const picture = pictureControl.useValue()
  if (ink && ink.controller.selectionCount() > 0) return false
  // A picture selected by a tap is not a text range: the picture control says so.
  if (picture) return true
  // Words and drawings are the Lasso's; other tools keep their own bars.
  if (!lasso) return false
  const sel = selected(editor)
  // The mini toolbar covers a tap selection of words.
  return !!sel && !(sel.text && miniToolbarOpen.get())
}

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

export default function SelectionBarV8({
  lasso,
  moreOpen,
  onMore,
  pictureOpen,
  onPicture,
}: {
  lasso: boolean
  moreOpen: boolean
  onMore: (anchor: HTMLElement) => void
  pictureOpen: boolean
  onPicture: (anchor: HTMLElement) => void
}) {
  const editor = useBlockNoteEditor() as unknown as Editor
  const run = useSelActions(editor)
  const show = useHasSelection(editor, lasso)
  const pic = pictureControl.useValue()
  const canEdit = useUnlocked('tb.pictureEdit')
  if (!show) return null
  return (
    <div
      role="toolbar"
      aria-label={t('v8.sel.label')}
      className="v8sel"
      data-chrome
      data-ctx-bar
      data-testid="v8-selbar"
    >
      {barItems().map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={t(item.label)}
          data-testid={`v8-sel-${item.id}`}
          data-coming={DIM.has(item.id) ? '' : undefined}
          onMouseDown={keepFocus}
          onClick={() => run(item.id)}
        >
          <Icon name={item.icon} />
        </button>
      ))}
      {pic && canEdit ? (
        <button
          type="button"
          aria-label={t('v8.sel.editPicture')}
          aria-expanded={pictureOpen}
          data-testid="v8-sel-picture"
          onMouseDown={keepFocus}
          onClick={(e) => onPicture(e.currentTarget)}
        >
          <Icon name="image" />
        </button>
      ) : null}
      <button
        type="button"
        aria-label={t('v8.sel.more')}
        aria-expanded={moreOpen}
        data-testid="v8-sel-more"
        onMouseDown={keepFocus}
        onClick={(e) => onMore(e.currentTarget)}
      >
        <Icon name="more" />
      </button>
    </div>
  )
}

const PICTURE_ACTIONS: readonly [PictureAction, MessageKey][] = [
  ['cropRotate', 'pic.s.crop'],
  ['smaller', 'pic.s.smaller'],
  ['bigger', 'pic.s.bigger'],
  ['fit', 'pic.s.fit'],
  ['fitPage', 'pic.fitPage'],
  ['natural', 'pic.s.natural'],
]

/** The body of the two selection cards: `sel.more` and `sel.picture`. */
export function SelCardBody({
  id,
  onDone,
}: {
  id: string
  onDone: () => void
}) {
  const editor = useBlockNoteEditor() as unknown as Editor
  const run = useSelActions(editor)
  const pic = pictureControl.useValue()
  const unlocked = useUnlocked('tb.selectionMenu')
  if (id === 'sel.picture')
    return (
      <div
        className="v8sel-more"
        data-chrome
        data-ctx-bar
        data-testid="v8-sel-picture-list"
      >
        {PICTURE_ACTIONS.map(([action, key]) => (
          <button
            key={action}
            type="button"
            onMouseDown={keepFocus}
            onClick={() => {
              pic?.run(action)
              if (action === 'cropRotate') onDone()
            }}
          >
            {t(key)}
          </button>
        ))}
      </div>
    )
  return (
    <div className="v8sel-more" data-chrome data-ctx-bar>
      {moreItems(() => unlocked).map((item) => (
        <button
          key={item.id}
          type="button"
          data-sel={item.id}
          data-coming={DIM.has(item.id) || SOON.has(item.id) ? '' : undefined}
          onMouseDown={keepFocus}
          onClick={() => {
            run(item.id)
            onDone()
          }}
        >
          <Icon name={item.icon} size={18} />
          {t(item.label)}
        </button>
      ))}
    </div>
  )
}
