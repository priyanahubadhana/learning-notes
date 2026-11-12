import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '../../../design/parts/Card'
import { t } from '../../../i18n/t'
import { activeTool } from '../main/mainTools'
import {
  followMode,
  modeToTool,
  tapTool,
  toggleCard,
  v8Tool,
  type OpenCard,
} from './barState'
import { ToolBar } from './ToolBar'
import { ToolRow } from './ToolRow'
import { cardInfo } from './rowItems'
import type { V8ToolId } from './registryV8'
import './toolbarV8.css'

/**
 * The new tool bar (toolbar.v8). Slice 1b: the tool bar, the tool row and an
 * empty card per ▾. Card contents come with 1c to 1f; Favourites with 1g.
 */
export default function ToolbarV8() {
  const tool = v8Tool.useValue()
  const [card, setCard] = useState<OpenCard | null>(null)
  const root = useRef<HTMLDivElement>(null)

  // The page's own mode changed (the Pencil, a shortcut): the bar follows.
  useEffect(
    () =>
      activeTool.subscribe(() => {
        const next = modeToTool(activeTool.get())
        if (next && next !== v8Tool.get()) {
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
      followMode(next.tool)
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
      {card && info && !card.id.startsWith('fold.') ? (
        <Card
          key={card.id}
          anchor={card.anchor}
          size={info.size}
          title={t(info.title)}
          testId={`v8-card-${card.id}`}
          onClose={() => onCloseCard(card.id)}
        >
          {/* 1c to 1f fill the cards. */}
          <p className="v8note" tabIndex={0}>
            {t('v8.card.empty')}
          </p>
        </Card>
      ) : null}
    </div>
  )
}
