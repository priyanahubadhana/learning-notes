import { useState } from 'react'
import { Card } from '../../../design/parts/Card'
import { CardGroup, Tile, TileGroup } from '../../../design/parts/CardParts'
import { t } from '../../../i18n/t'
import { Icon } from '../icons'
import { FavPic } from './PenPictures'
import {
  chooseFavourite,
  favIsActive,
  favLabel,
  favName,
  type FavItem,
} from './penRow'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

/** One saved pen or highlighter on the Pen row (TB-21c). */
function FavChip({ item, mode }: { item: FavItem; mode: string }) {
  // Glows once when tapped (TB-70); the key restarts the one-shot animation.
  const [glow, setGlow] = useState(0)
  return (
    <button
      type="button"
      data-chrome
      data-testid={`v8-fav-${item.id.slice(3)}`}
      className="v8chip v8chip-fav"
      aria-label={favLabel(item)}
      aria-pressed={favIsActive(item.fav, mode)}
      onMouseDown={keepFocus}
      onClick={() => {
        chooseFavourite(item)
        setGlow((n) => n + 1)
      }}
    >
      {glow ? <span key={glow} className="pcard-glow" aria-hidden /> : null}
      <FavPic typeId={item.typeId} colour={item.fav.colour} />
      <span className="v8chip-text">{favName(item)}</span>
    </button>
  )
}

/** The favourites on the row; they keep their names when other chips lose theirs. */
export function FavGroup({ items, mode }: { items: FavItem[]; mode: string }) {
  return (
    <>
      {items.map((f) => (
        <FavChip key={f.id} item={f} mode={mode} />
      ))}
    </>
  )
}

/** The favourites drawn only to measure their width as one group. */
export function FavMeasure({ items }: { items: FavItem[] }) {
  return (
    <>
      {(['full', 'short'] as const).map((m) => (
        <span key={m} className="v8favgroup" data-m-id="favs" data-m-mode={m}>
          {items.map((f) => (
            <span key={f.id} className="v8chip v8chip-fav">
              <FavPic typeId={f.typeId} colour={f.fav.colour} />
              <span className="v8chip-text">{favName(f)}</span>
            </span>
          ))}
        </span>
      ))}
    </>
  )
}

/** "★ n": the favourites that did not fit, in a card of picture tiles (v9). */
export function FavStar({
  items,
  mode,
  open,
  card,
  onToggle,
  onClose,
}: {
  items: FavItem[]
  mode: string
  open: boolean
  card: { anchor: HTMLElement } | null
  onToggle: (el: HTMLElement) => void
  onClose: () => void
}) {
  return (
    <>
      <button
        type="button"
        data-chrome
        data-popup-trigger=""
        data-testid="v8-favs-more"
        className="v8chip v8chip-more"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('v8.row.favsN', { count: items.length })}
        data-pressed={open || undefined}
        onMouseDown={keepFocus}
        onClick={(e) => onToggle(e.currentTarget)}
      >
        <Icon name="star" size={18} />
        <span className="v8badge">{items.length}</span>
      </button>
      {open && card ? (
        <Card
          anchor={card.anchor}
          size="pick"
          autoClose
          title={t('v8.fav.title')}
          onClose={() => onClose()}
          testId="v8-card-fold.favs"
        >
          <CardGroup>
            <TileGroup label={t('v8.fav.title')} columns={2}>
              {items.map((f) => (
                <Tile
                  key={f.id}
                  label={favLabel(f)}
                  selected={favIsActive(f.fav, mode)}
                  testId={`v8-favtile-${f.id.slice(3)}`}
                  onSelect={() => chooseFavourite(f)}
                >
                  <span className="v8tiletype">
                    <FavPic typeId={f.typeId} colour={f.fav.colour} />
                    <small>{favName(f)}</small>
                  </span>
                </Tile>
              ))}
            </TileGroup>
          </CardGroup>
        </Card>
      ) : null}
    </>
  )
}
