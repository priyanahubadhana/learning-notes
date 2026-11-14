import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '../../../design/parts/Card'
import { t } from '../../../i18n/t'
import { applyLayerVars } from '../../overlay'
import { onRouted, PRIORITY } from '../../input/eventRouter'
import { pictureControl } from '../../../editor/pictureControl'
import { activeTool } from '../main/mainTools'
import {
  followMode,
  modeToTool,
  tapTool,
  toggleCard,
  v8Tool,
  type OpenCard,
} from './barState'
import { NEWLINE_CARD, ToolBar } from './ToolBar'
import { ToolRow } from './ToolRow'
import { isPenCard } from './cards/pen/penModel'
import { cardAutoClose } from './cards/autoClose'
import { isShapeDraw } from './cards/shapes/shapesModel'
import { activeBox } from '../../../paper/activeBox'
import { penSettings } from '../main/inkSettings'
import { cardInfo } from './rowItems'
import { useTuckWatcher } from './useTuckWatcher'
import type { V8ToolId } from './registryV8'
import './toolbarV8.css'

// The Pen cards load when the first one opens (keeps the first load small).
const PenCardBody = lazy(() => import('./cards/pen/PenCards'))
const EraserCardBody = lazy(() => import('./cards/eraser/EraserCards'))
const ShapesCardBody = lazy(() => import('./cards/shapes/ShapesCards'))
const LassoCardBody = lazy(() => import('./cards/lasso/LassoCards'))
const TextCardBody = lazy(() => import('./cards/text/TextCards'))
const InsertCardBody = lazy(() => import('./cards/insert/InsertCards'))
const AllToolsCardBody = lazy(() => import('./cards/alltools/AllToolsCard'))
const SelectionBarV8 = lazy(() => import('./SelectionBarV8'))
const SelCardBody = lazy(() =>
  import('./SelectionBarV8').then((m) => ({ default: m.SelCardBody })),
)

/** The selected text box's rect: the Box card hangs around it, never over it. */
const activeBoxRect = () => {
  const at = activeBox.get()
  const r = at
    ? document
        .querySelector(`[data-paper-box="${at.boxId}"]`)
        ?.getBoundingClientRect()
    : null
  if (!r) return null
  // The frame and the handles sit just outside the box: keep clear of them too.
  const pad = 24
  return {
    left: r.left - pad,
    top: r.top - pad,
    width: r.width + 2 * pad,
    height: r.height + 2 * pad,
  }
}

/** The picked picture's rect: the Edit picture card keeps clear of it. */
const pickedPictureRect = () =>
  document
    .querySelector('.bn-file-block-content-wrapper[data-v8-picked]')
    ?.getBoundingClientRect() ?? null

/**
 * The new tool bar (toolbar.v8). Slice 1b: the tool bar, the tool row and an
 * empty card per ▾. Card contents come with 1c to 1f; Favourites with 1g.
 */
export default function ToolbarV8() {
  const tool = v8Tool.useValue()
  const picture = pictureControl.useValue() !== null
  const [card, setCard] = useState<OpenCard | null>(null)
  const root = useRef<HTMLDivElement>(null)
  useTuckWatcher()

  // The shared stacking table as --z-* variables (the name tip uses --z-menu).
  useEffect(() => applyLayerVars(), [])
  // Rings on keyboard focus only: a tap or click that opens a card marks the
  // pointer as the last input, and any key clears it (toolCards.css).
  useEffect(() => {
    const root = document.documentElement
    const pointer = () => root.setAttribute('data-v8-pointer', '')
    const key = () => root.removeAttribute('data-v8-pointer')
    // Only keys that move or act on focus bring the ring back: typing or
    // Home/End in the text must not light up a chip a tap left focused.
    const NAV = /^(Tab|Arrow|Escape$|Enter$| $|F6$)/
    // Watch only (never "handled"), ahead of everyone else.
    const first = { priority: PRIORITY.gesture + 1, name: 'v8-ring-modality' }
    const offPointer = onRouted('pointerdown', () => void pointer(), first)
    const offKey = onRouted(
      'keydown',
      (e) => void (NAV.test(e.key) && key()),
      first,
    )
    return () => {
      offPointer()
      offKey()
      key()
    }
  }, [])

  // The page's own mode changed (the Pencil, a shortcut): the bar follows.
  useEffect(
    () =>
      activeTool.subscribe(() => {
        const next = modeToTool(activeTool.get())
        // Shapes draws with the pen: that is not leaving Shapes.
        const keep =
          v8Tool.get() === 'shapes' &&
          next === 'pen' &&
          isShapeDraw(penSettings.get().drawAs)
        if (next && next !== v8Tool.get() && !keep) {
          v8Tool.set(next)
          setCard(null)
        }
      }),
    [],
  )

  /** Where a card hangs: its own chip in the row, else the given fallback. */
  const anchorFor = useCallback(
    (id: string, fallback: HTMLElement) =>
      root.current?.querySelector<HTMLElement>(
        `[data-testid="v8-chip-${id}"]`,
      ) ?? fallback,
    [],
  )

  const onTool = (id: V8ToolId, el: HTMLElement) => {
    const next = tapTool({ tool, card: card?.id ?? null }, id)
    if (next.tool !== tool) {
      v8Tool.set(next.tool)
      followMode(next.tool, tool)
    }
    setCard(
      next.card ? { id: next.card, anchor: anchorFor(next.card, el) } : null,
    )
  }

  const onToggleCard = (id: string, anchor: HTMLElement) => {
    const next = toggleCard({ tool, card: card?.id ?? null }, id)
    setCard(next.card ? { id, anchor } : null)
  }

  const onCloseCard = (id: string) =>
    setCard((c) => (c && c.id === id ? null : c))

  const info = card ? cardInfo(card.id) : null
  /** The Box card stays 8 px under the bar (its tool line and Text row). */
  const barBottom = () =>
    (root.current?.getBoundingClientRect().bottom ?? 0) + 8

  return (
    <div ref={root} className="v8" data-testid="toolbar-v8" data-tool={tool}>
      <ToolBar
        tool={tool}
        card={card}
        onTool={onTool}
        onToggleCard={onToggleCard}
        onCloseCard={onCloseCard}
      />
      <ToolRow
        tool={tool}
        card={card}
        onToggleCard={onToggleCard}
        onCloseCard={onCloseCard}
      />
      {tool === 'lasso' || picture ? (
        <Suspense fallback={null}>
          <SelectionBarV8
            lasso={tool === 'lasso'}
            openId={card?.id ?? null}
            onCard={(id, a) => onToggleCard(id, a)}
          />
        </Suspense>
      ) : null}
      {card &&
      info &&
      !card.id.startsWith('fold.') &&
      card.id !== NEWLINE_CARD ? (
        <Card
          key={card.id}
          anchor={card.anchor}
          size={info.size}
          autoClose={cardAutoClose(card.id)}
          avoid={card.id === 'sel.picture' ? pickedPictureRect : undefined}
          around={card.id === 'text.box' ? activeBoxRect : undefined}
          clearTop={card.id === 'text.box' ? barBottom : undefined}
          title={t(info.title)}
          testId={`v8-card-${card.id}`}
          onClose={() => onCloseCard(card.id)}
        >
          <Suspense fallback={null}>
            {isPenCard(card.id) ? (
              <PenCardBody id={card.id} />
            ) : card.id.startsWith('eraser.') ? (
              <EraserCardBody id={card.id} />
            ) : card.id.startsWith('shapes.') ? (
              <ShapesCardBody id={card.id} />
            ) : card.id.startsWith('lasso.') ? (
              <LassoCardBody id={card.id} />
            ) : card.id.startsWith('sel.') ? (
              <SelCardBody
                id={card.id}
                onDone={() => onCloseCard(card.id)}
                onSwap={(id) => setCard((c) => (c ? { ...c, id } : c))}
              />
            ) : card.id.startsWith('text.') ? (
              <TextCardBody id={card.id} />
            ) : card.id === 'insert' ? (
              <InsertCardBody />
            ) : card.id === 'more.alltools' ? (
              <AllToolsCardBody />
            ) : null}
          </Suspense>
        </Card>
      ) : null}
    </div>
  )
}
