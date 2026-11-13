import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '../../../design/parts/Card'
import { t } from '../../../i18n/t'
import { applyLayerVars } from '../../overlay'
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
import { penSettings } from '../main/inkSettings'
import { cardInfo } from './rowItems'
import type { V8ToolId } from './registryV8'
import './toolbarV8.css'

// The Pen cards load when the first one opens (keeps the first load small).
const PenCardBody = lazy(() => import('./cards/pen/PenCards'))
const EraserCardBody = lazy(() => import('./cards/eraser/EraserCards'))
const ShapesCardBody = lazy(() => import('./cards/shapes/ShapesCards'))
const LassoCardBody = lazy(() => import('./cards/lasso/LassoCards'))
const SelectionBarV8 = lazy(() => import('./SelectionBarV8'))
const SelCardBody = lazy(() =>
  import('./SelectionBarV8').then((m) => ({ default: m.SelCardBody })),
)

/**
 * The new tool bar (toolbar.v8). Slice 1b: the tool bar, the tool row and an
 * empty card per ▾. Card contents come with 1c to 1f; Favourites with 1g.
 */
export default function ToolbarV8() {
  const tool = v8Tool.useValue()
  const picture = pictureControl.useValue() !== null
  const [card, setCard] = useState<OpenCard | null>(null)
  const root = useRef<HTMLDivElement>(null)

  // The shared stacking table as --z-* variables (the name tip uses --z-menu).
  useEffect(() => applyLayerVars(), [])

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
            ) : (
              /* 1e and 1f fill the other cards. */
              <p className="v8note">{t('v8.card.empty')}</p>
            )}
          </Suspense>
        </Card>
      ) : null}
    </div>
  )
}
