import { useBlockNoteEditor } from '@blocknote/react'
import { useCallback, useRef } from 'react'
import {
  CardGroup,
  SizeTile,
  Swatch,
  TileGroup,
} from '../../../design/parts/CardParts'
import { ScrollTrack } from '../../../design/parts/ScrollTrack'
import { t, type MessageKey } from '../../../i18n/t'
import { copyAs } from '../../../editor/clipboard'
import { pasteFromClipboard } from '../../../editor/pasteFromBar'
import type { Editor } from '../../../editor/barActions'
import {
  pictureControl,
  type PictureAction,
} from '../../../editor/pictureControl'
import { deselect } from '../../../editor/ownSelection'
import { inkFor, useInk } from '../../../ink/inkRuntime'
import { inkSelControl } from '../../../ink/inkSelControl'
import { PEN_COLOURS } from '../main/inkSettings'
import { NOTE_SIZES, applyNoteStyle, noteSize } from '../main/textStyle'
import { useUnlocked } from '../../../settings/level'
import { runEditorCommand } from '../editorCommands'
import { Icon, type IconName } from '../icons'
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
          // One paste path (PM-40 to PM-46): the planner and "Paste as".
          void pasteFromClipboard(editor, toast)
          break
        case 'resize':
          // Words have a size too: the text size card, not a dead button.
          onCard('sel.size')
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
      <ScrollTrack className="v8sel-row">
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
      </ScrollTrack>
    </div>
  )
}

const PICTURE_ACTIONS: readonly [PictureAction, MessageKey, IconName][] = [
  ['cropRotate', 'pic.s.crop', 'rotate'],
  ['smaller', 'pic.s.smaller', 'zoomOut'],
  ['bigger', 'pic.s.bigger', 'zoom'],
  ['fit', 'pic.s.fit', 'maximize'],
  ['fitPage', 'pic.fitPage', 'panel'],
  ['natural', 'pic.s.natural', 'image'],
]
const PICTURE_SIZES = PICTURE_ACTIONS.slice(1)

/** One step each, one Undo step each: Smaller, Bigger, Half, Double. */
const INK_SIZES: readonly [number, MessageKey, IconName][] = [
  [0.8, 'pic.s.smaller', 'zoomOut'],
  [1.25, 'pic.s.bigger', 'zoom'],
  [0.5, 'v8.sel.half', 'shrink'],
  [2, 'v8.sel.double', 'grow'],
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

/** One row of a selection card: an icon and a word, like the Actions card. */
function Row({
  icon,
  label,
  onClick,
  testId,
}: {
  icon: IconName
  label: string
  onClick: () => void
  testId?: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onMouseDown={keepFocus}
      onClick={onClick}
    >
      <Icon name={icon} size={18} />
      {label}
    </button>
  )
}

/** The colour all the selected strokes share (lower case), or null. */
function sharedColour(
  strokes: readonly { stroke: { style: { colour: string } } }[] | undefined,
): string | null {
  const first = strokes?.[0]?.stroke.style.colour.toLowerCase()
  if (!first) return null
  return strokes!.every((s) => s.stroke.style.colour.toLowerCase() === first)
    ? first
    : null
}

/** The body of the selection cards: more, picture, resize, colour, move, text size. */
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
  const size = noteSize.useValue()
  if (id === 'sel.size')
    return (
      <CardGroup>
        <TileGroup label={t('v8.sel.textSize')} columns={5}>
          {NOTE_SIZES.map((s) => (
            <SizeTile
              key={s}
              px={Math.round(s * 0.16)}
              label={`${s}%`}
              selected={s === size}
              testId={`v8-sel-size-${s}`}
              onSelect={() => {
                noteSize.set(s)
                applyNoteStyle()
              }}
            />
          ))}
        </TileGroup>
      </CardGroup>
    )
  if (id === 'sel.colour') {
    const now = sharedColour(ink?.selected())
    return (
      <CardGroup>
        <TileGroup label={t('ink.sel.colour')} columns={3}>
          {PEN_COLOURS.map((c) => (
            <Swatch
              key={c.id}
              colour={c.hex}
              label={t(`ink.colour.${c.id}` as MessageKey)}
              selected={now === c.hex.toLowerCase()}
              testId={`v8-sel-colour-${c.id}`}
              onSelect={() => ink?.colourSelection(c.hex)}
            />
          ))}
        </TileGroup>
      </CardGroup>
    )
  }
  if (id === 'sel.move')
    return (
      <div className="v8sel-more" data-chrome data-ctx-bar>
        {INK_MOVES.map(([dx, dy, key, icon]) => (
          <Row
            key={key}
            icon={icon}
            label={t(key)}
            onClick={() => ink?.transformSelectionBy({ dx, dy })}
          />
        ))}
      </div>
    )
  if (id === 'sel.resize')
    return (
      <div className="v8sel-more" data-chrome data-ctx-bar>
        {pic
          ? PICTURE_SIZES.map(([action, key, icon]) => (
              <Row
                key={action}
                icon={icon}
                label={t(key)}
                onClick={() => pic.run(action)}
              />
            ))
          : INK_SIZES.map(([scale, key, icon]) => (
              <Row
                key={key}
                icon={icon}
                label={t(key)}
                onClick={() => ink?.transformSelectionBy({ scale })}
              />
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
        <CardGroup label={t('v8.sel.groupEdit')}>
          <Row
            icon="rotate"
            label={t('pic.s.crop')}
            onClick={() => {
              pic?.run('cropRotate')
              onDone()
            }}
          />
        </CardGroup>
        <CardGroup label={t('v8.sel.groupSize')}>
          {PICTURE_SIZES.map(([action, key, icon]) => (
            <Row
              key={action}
              icon={icon}
              label={t(key)}
              onClick={() => pic?.run(action)}
            />
          ))}
        </CardGroup>
        <CardGroup label={t('v8.sel.groupLook')}>
          <Row
            icon="square"
            label={t('pic.act.border')}
            onClick={() => pic?.run('border')}
          />
        </CardGroup>
      </div>
    )
  return (
    <div className="v8sel-more" data-chrome data-ctx-bar>
      {pic ? (
        // The old picture strip is gone while the bar owns the selection.
        <Row
          icon="square"
          label={t('pic.act.border')}
          onClick={() => {
            pic.run('border')
            onDone()
          }}
        />
      ) : null}
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
