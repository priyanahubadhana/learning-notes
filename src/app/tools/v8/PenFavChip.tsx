import { useState } from 'react'
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
export function FavChip({
  item,
  mode,
  names,
}: {
  item: FavItem
  mode: string
  names: boolean
}) {
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
        chooseFavourite(item.fav)
        setGlow((n) => n + 1)
      }}
    >
      {glow ? <span key={glow} className="pcard-glow" aria-hidden /> : null}
      <FavPic typeId={item.typeId} colour={item.fav.colour} />
      {names ? <span className="v8chip-text">{favName(item)}</span> : null}
    </button>
  )
}

/** The same favourite, drawn only to measure its width. */
export function FavMeasure({ item, names }: { item: FavItem; names: boolean }) {
  return (
    <span
      className="v8chip v8chip-fav"
      data-m-id={item.id}
      data-m-mode={names ? 'full' : 'short'}
    >
      <FavPic typeId={item.typeId} colour={item.fav.colour} />
      {names ? <span className="v8chip-text">{favName(item)}</span> : null}
    </span>
  )
}
