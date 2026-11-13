import { useBlockNoteEditor } from '@blocknote/react'
import { useCallback, useRef } from 'react'
import { CardGroup, Swatch, TileGroup } from '../../../design/parts/CardParts'
import { t, type MessageKey } from '../../../i18n/t'
import { copyAs, pastePlainFromClipboard } from '../../../editor/clipboard'
import type { Editor } from '../../../editor/barActions'
import {
  pictureControl,
  type PictureAction,
} from '../../../editor/pictureControl'
import { deselect } from '../../../editor/ownSelection'
import { inkFor, useInk } from '../../../ink/inkRuntime'
import { inkSelControl } from '../../../ink/inkSelControl'
import { PEN_COLOURS } from '../main/inkSettings'
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

/** Actions that open their own card (the same card for Resize and Scale). */
const CARD_OF: Record<string, string> = {
  colour: 'sel.colour',
  resize: 'sel.resize',
  scale: 'sel.resize',
  move: 'sel.move',
}
const PICTURE_SAME = new Set(['cut', 'copy', 'duplicate', 'delete', 'deselect'])

function useSelActions(editor: Editor, onCard: (id: string) => void) {
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
      // Drawings the Lasso picked: the surface runs the action.
      const ink = inkSelControl.get()
      if (ink) {
        const card = CARD_OF[id]
        if (card) return onCard(card)
        return ink.run(id)
      }
      if (pic && PICTURE_SAME.has(id)) return pic.run(id as PictureAction)
      if (pic && CARD_OF[id] === 'sel.resize') return onCard('sel.resize')
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
          say('ink.sel.textOnly')
      }
    },
    [editor, onCard],
  )
}

/** True when the bar should show: words or a picture are selected. */
function useHasSelection(editor: Editor, lasso: boolean): boolean {
  useEditorRedraw(editor)
  const ink = useInk()
  const picture = pictureControl.useValue()
  // Drawings the Lasso picked: the surface says whether the bar has them.
  const inkPicked = inkSelControl.useValue() !== null
  if (ink && ink.controller.selectionCount() > 0) return inkPicked
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
  openId,
  onCard,
}: {
  lasso: boolean
  /** The id of the open selection card, if any. */
  openId: string | null
  onCard: (id: string, anchor: HTMLElement) => void
}) {
  const editor = useBlockNoteEditor() as unknown as Editor
  const anchor = useRef<HTMLElement | null>(null)
  const run = useSelActions(editor, (id) => {
    if (anchor.current) onCard(id, anchor.current)
  })
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
          aria-expanded={
            CARD_OF[item.id] ? openId === CARD_OF[item.id] : undefined
          }
          onMouseDown={keepFocus}
          onClick={(e) => {
            anchor.current = e.currentTarget
            run(item.id)
          }}
        >
          <Icon name={item.icon} />
          <span className="v8sel-word">{t(item.label)}</span>
        </button>
      ))}
      {pic && canEdit ? (
        <button
          type="button"
          aria-label={t('v8.sel.editPicture')}
          aria-expanded={openId === 'sel.picture'}
          data-testid="v8-sel-picture"
          onMouseDown={keepFocus}
          onClick={(e) => onCard('sel.picture', e.currentTarget)}
        >
          <Icon name="image" />
          <span className="v8sel-word">{t('v8.sel.editPicture')}</span>
        </button>
      ) : null}
      <button
        type="button"
        aria-label={t('v8.sel.more')}
        aria-expanded={openId === 'sel.more'}
        data-testid="v8-sel-more"
        onMouseDown={keepFocus}
        onClick={(e) => onCard('sel.more', e.currentTarget)}
      >
        <Icon name="more" />
        <span className="v8sel-word">{t('v8.sel.more')}</span>
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
const PICTURE_SIZES = PICTURE_ACTIONS.slice(1)

/** One step each, one Undo step each: Smaller, Bigger, Half, Double. */
const INK_SIZES: readonly [number, MessageKey][] = [
  [0.8, 'pic.s.smaller'],
  [1.25, 'pic.s.bigger'],
  [0.5, 'v8.sel.half'],
  [2, 'v8.sel.double'],
]
const NUDGE = 24
const INK_MOVES: readonly [
  number,
  number,
  MessageKey,
  'chevronLeft' | 'chevronRight' | 'chevronUp' | 'chevronDown',
][] = [
  [-NUDGE, 0, 'v8.sel.moveLeft', 'chevronLeft'],
  [NUDGE, 0, 'v8.sel.moveRight', 'chevronRight'],
  [0, -NUDGE, 'v8.sel.moveUp', 'chevronUp'],
  [0, NUDGE, 'v8.sel.moveDown', 'chevronDown'],
]

/** The body of the selection cards: more, picture, resize, colour, move. */
export function SelCardBody({
  id,
  onDone,
  onSwap,
}: {
  id: string
  onDone: () => void
  /** Replaces this card with another selection card (never a card from a card). */
  onSwap: (id: string) => void
}) {
  const editor = useBlockNoteEditor() as unknown as Editor
  const run = useSelActions(editor, onSwap)
  const pic = pictureControl.useValue()
  const ink = useInk()?.controller
  const unlocked = useUnlocked('tb.selectionMenu')
  if (id === 'sel.colour')
    return (
      <CardGroup>
        <TileGroup label={t('ink.sel.colour')} columns={3}>
          {PEN_COLOURS.map((c) => (
            <Swatch
              key={c.id}
              colour={c.hex}
              label={c.id}
              testId={`v8-sel-colour-${c.id}`}
              onSelect={() => ink?.colourSelection(c.hex)}
            />
          ))}
        </TileGroup>
      </CardGroup>
    )
  if (id === 'sel.move')
    return (
      <div className="v8sel-more" data-chrome data-ctx-bar>
        {INK_MOVES.map(([dx, dy, key, icon]) => (
          <button
            key={key}
            type="button"
            onMouseDown={keepFocus}
            onClick={() => ink?.transformSelectionBy({ dx, dy })}
          >
            <Icon name={icon} size={18} />
            {t(key)}
          </button>
        ))}
      </div>
    )
  if (id === 'sel.resize')
    return (
      <div className="v8sel-more" data-chrome data-ctx-bar>
        {pic
          ? PICTURE_SIZES.map(([action, key]) => (
              <button
                key={action}
                type="button"
                onMouseDown={keepFocus}
                onClick={() => pic.run(action)}
              >
                {t(key)}
              </button>
            ))
          : INK_SIZES.map(([scale, key]) => (
              <button
                key={key}
                type="button"
                onMouseDown={keepFocus}
                onClick={() => ink?.transformSelectionBy({ scale })}
              >
                {t(key)}
              </button>
            ))}
      </div>
    )
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
          onMouseDown={keepFocus}
          onClick={() => {
            run(item.id)
            // A card-opening action swapped this card first; closing is then a no-op.
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
