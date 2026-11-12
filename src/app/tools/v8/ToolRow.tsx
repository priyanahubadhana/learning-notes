import { useActiveStyles, useBlockNoteEditor } from '@blocknote/react'
import { CardTrigger } from '../../../design/parts/Card'
import { t } from '../../../i18n/t'
import { Icon } from '../icons'
import { ROW_ITEMS, cardIdOf, type RowItem } from './rowItems'
import { dotPx, usePenFace, type PenFace } from './penFace'
import { useChangeCounts } from './changeCount'
import type { V8ToolId } from './registryV8'
import { FoldCard } from './FoldCard'
import type { OpenCard } from './barState'
import { useFold, type FoldSpec } from './useFold'
import './toolbarV8.css'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

/** What a chip says, and how its dot looks, from the pen's saved settings. */
function view(item: RowItem, pen: PenFace) {
  let text = t(item.label)
  if (item.tool === 'pen' && item.id === 'type')
    text = t(`v8.pen.type.${pen.typeId}`)
  if (item.tool === 'pen' && item.id === 'size')
    text = t(`v8.pen.size.${pen.size}`)
  return {
    text,
    colour: item.dot === 'colour' ? pen.colour : undefined,
    dotPx: item.dot === 'size' ? dotPx(pen) : 0,
  }
}

function Face({
  item,
  pen,
  names,
}: {
  item: RowItem
  pen: PenFace
  names: boolean
}) {
  const v = view(item, pen)
  return (
    <>
      {item.dot === 'colour' ? (
        <span
          className="v8dot v8dot-colour"
          style={{ background: v.colour }}
          aria-hidden
        />
      ) : item.dot === 'size' ? (
        <span className="v8dot-box" aria-hidden>
          <span className="v8dot" style={{ width: v.dotPx, height: v.dotPx }} />
        </span>
      ) : item.icon ? (
        <Icon name={item.icon} size={18} />
      ) : null}
      {names && item.kind === 'menu' ? (
        <span className="v8chip-text">{v.text}</span>
      ) : null}
    </>
  )
}

export interface ToolRowProps {
  tool: V8ToolId
  /** The open card, if any. */
  card: OpenCard | null
  onToggleCard: (id: string, anchor: HTMLElement) => void
  onCloseCard: (id: string) => void
}

/** The second line: the tool's options, then (1g) Favourites, "+" and "☰". */
export function ToolRow({
  tool,
  card,
  onToggleCard,
  onCloseCard,
}: ToolRowProps) {
  const openCard = card?.id ?? null
  const pen = usePenFace()
  // Each changed chip glows once (TB-70).
  const glow = useChangeCounts({
    'pen.type': pen.typeId,
    'pen.size': `${pen.size}-${pen.px}`,
    'pen.colour': pen.colour,
  })
  const editor = useBlockNoteEditor()
  const active = useActiveStyles(editor as never) as Record<string, unknown>
  const items = ROW_ITEMS[tool]
  const specs: FoldSpec[] = items.map((it, i) => ({
    id: it.id,
    priority: 100 - i,
    fixedW: it.kind === 'toggle' ? 44 : undefined,
  }))
  const { rowRef, measureRef, result } = useFold(specs, { gap: 8, moreW: 44 })
  const shown = items.filter((i) => result.shown.includes(i.id))
  const folded = items.filter((i) => result.folded.includes(i.id))
  const moreOpen = openCard === 'fold.row'

  const toggleStyle = (item: RowItem) => {
    if (!item.style) return
    ;(
      editor as { toggleStyles: (s: Record<string, boolean>) => void }
    ).toggleStyles({ [item.style]: true })
  }

  return (
    <div
      className="v8row"
      role="group"
      aria-label={t('v8.row.label')}
      data-testid="v8-row"
      data-tool={tool}
    >
      <div className="v8row-items" ref={rowRef}>
        {shown.map((item) =>
          item.kind === 'menu' ? (
            <CardTrigger
              key={item.id}
              className="v8chip"
              open={openCard === cardIdOf(item)}
              label={view(item, pen).text}
              glowKey={glow[cardIdOf(item)]}
              testId={`v8-chip-${cardIdOf(item)}`}
              onClick={(el) => onToggleCard(cardIdOf(item), el)}
            >
              <Face item={item} pen={pen} names={result.names} />
            </CardTrigger>
          ) : (
            <button
              key={item.id}
              type="button"
              data-chrome
              data-testid={`v8-chip-${cardIdOf(item)}`}
              className="v8chip v8chip-icon"
              aria-label={t(item.label)}
              aria-pressed={!!item.style && !!active[item.style]}
              onMouseDown={keepFocus}
              onClick={() => toggleStyle(item)}
            >
              <Face item={item} pen={pen} names={false} />
            </button>
          ),
        )}
        {folded.length > 0 ? (
          <button
            type="button"
            data-chrome
            data-popup-trigger=""
            data-testid="v8-row-more"
            className="v8chip v8chip-more"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-label={t('v8.row.moreN', { count: folded.length })}
            data-pressed={moreOpen || undefined}
            onMouseDown={keepFocus}
            onClick={(e) => onToggleCard('fold.row', e.currentTarget)}
          >
            <Icon name="more" size={18} />
            <span className="v8badge">{folded.length}</span>
          </button>
        ) : null}
        <div className="v8measure" ref={measureRef} aria-hidden inert>
          {items
            .filter((i) => i.kind === 'menu')
            .flatMap((item) =>
              (['full', 'short'] as const).map((mode) => (
                <span
                  key={`${item.id}-${mode}`}
                  className="pcard-trigger v8chip"
                  data-m-id={item.id}
                  data-m-mode={mode}
                >
                  <Face item={item} pen={pen} names={mode === 'full'} />
                  <Icon name="chevronDown" size={16} />
                </span>
              )),
            )}
        </div>
      </div>
      {moreOpen && card ? (
        <FoldCard
          anchor={card.anchor}
          testId="v8-card-fold.row"
          entries={folded.map((item) => ({
            id: item.id,
            label: view(item, pen).text,
            icon: item.icon,
            pressed: !!item.style && !!active[item.style],
            onPick: () => {
              if (item.kind === 'menu')
                onToggleCard(cardIdOf(item), card.anchor)
              else {
                toggleStyle(item)
                onCloseCard('fold.row')
              }
            },
          }))}
          onClose={() => onCloseCard('fold.row')}
        />
      ) : null}
      <span className="v8hair" aria-hidden />
      {/* Slice 1g: Add favourite and Organise. Placeholders until then. */}
      <button
        type="button"
        data-chrome
        data-testid="v8-add"
        className="v8chip v8chip-icon"
        aria-label={t('v8.row.add')}
        aria-disabled="true"
        onMouseDown={keepFocus}
      >
        <Icon name="plus" size={18} />
      </button>
      <button
        type="button"
        data-chrome
        data-testid="v8-organise"
        className="v8chip v8chip-icon"
        aria-label={t('v8.row.organise')}
        aria-disabled="true"
        onMouseDown={keepFocus}
      >
        <Icon name="list" size={18} />
      </button>
    </div>
  )
}
