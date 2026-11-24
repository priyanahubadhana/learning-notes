import { useState } from 'react'
import { Card } from '../../../design/parts/Card'
import { CardGroup, Tile, TileGroup } from '../../../design/parts/CardParts'
import { t } from '../../../i18n/t'
import { Icon } from '../icons'
import { penSettings } from '../main/inkSettings'
import { metaOf } from '../toolRegistryMeta'
import { FavPic } from './PenPictures'
import { chooseFav, favLabel, favName, justAdded } from './favRow'
import { favIsOn, type Fav2 } from './favs2'
import type { PenTypeId } from './penFace'
import { v8Icon } from './registryV8'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

/** A pen draws its sample stroke; every other tool shows its own icon. */
export function FavFace({ fav }: { fav: Fav2 }) {
  if (fav.tool !== 'pen')
    return (
      <span className="v8favwell" aria-hidden>
        <Icon name={v8Icon(fav.tool, metaOf(fav.tool)?.icon)} size={16} />
      </span>
    )
  const typeId: PenTypeId = fav.hl ? 'highlighter' : (fav.type ?? 'fountain')
  return (
    <FavPic typeId={typeId} colour={fav.colour ?? penSettings.get().colour} />
  )
}

/** One favourite on the row (TB-21c, TB-50). */
function FavChip({ item, n }: { item: Fav2; n: number }) {
  // Glows once when tapped or just saved (TB-52, TB-70); the key restarts it.
  const [glow, setGlow] = useState(() => (justAdded.get() === item.id ? 1 : 0))
  return (
    <button
      type="button"
      data-chrome
      data-testid={`v8-fav-${n}`}
      className="v8chip v8chip-fav"
      aria-label={favLabel(item)}
      aria-pressed={favIsOn(item)}
      onMouseDown={keepFocus}
      onClick={() => {
        chooseFav(item)
        setGlow((n) => n + 1)
      }}
    >
      {glow ? <span key={glow} className="pcard-glow" aria-hidden /> : null}
      <FavFace fav={item} />
      <span className="v8chip-text">{favName(item)}</span>
    </button>
  )
}

/** The favourites on the row; they keep their names when other chips lose theirs. */
export function FavGroup({ items }: { items: Fav2[] }) {
  return (
    <>
      {items.map((f, i) => (
        <FavChip key={f.id} item={f} n={i} />
      ))}
    </>
  )
}

/** The favourites drawn only to measure their width as one group. */
export function FavMeasure({ items }: { items: Fav2[] }) {
  return (
    <>
      {(['full', 'short'] as const).map((m) => (
        <span key={m} className="v8favgroup" data-m-id="favs" data-m-mode={m}>
          {items.map((f) => (
            <span key={f.id} className="v8chip v8chip-fav">
              <FavFace fav={f} />
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
  open,
  card,
  onToggle,
  onClose,
}: {
  items: Fav2[]
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
        <Icon name="star" size={16} />
        <span className="v8chip-count">{items.length}</span>
        <Icon name="chevronDown" size={14} />
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
              {items.map((f, i) => (
                <Tile
                  key={f.id}
                  label={favLabel(f)}
                  selected={favIsOn(f)}
                  testId={`v8-favtile-${i}`}
                  onSelect={() => chooseFav(f)}
                >
                  <span className="v8tiletype">
                    <FavFace fav={f} />
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
