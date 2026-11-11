import { t, type MessageKey } from '../../../i18n/t'
import { useLongPress } from '../../useLongPress'
import { currentRunner } from '../toolRuntime'
import { highlighterSettings, penSettings } from './inkSettings'
import { keepFocus, PILL_BUTTON } from './pillKit'
import { PillButton } from './pillParts'
import {
  addFavourite,
  applyFavourite,
  currentFavourite,
  favouritesOf,
  isCurrent,
  penFavourites,
  removeFavourite,
  type Favourite,
} from './penFavourites'

/**
 * The favourites of the Pen and Highlighter pills (polish 2, item 5): a ★
 * that saves the pen as it is now, then up to six saved pens. Tap one to set
 * the pen to it; press and hold (or right-click, or Delete) removes it, with
 * Undo.
 */

const toast = (message: string, undo?: () => void) =>
  currentRunner().app?.toast(
    message,
    undo ? { label: t('ink.fav.undo'), onSelect: undo } : undefined,
  )

function Chip({ fav, n }: { fav: Favourite; n: number }) {
  // Re-draw when the pen or highlighter changes (the ring follows it).
  penSettings.useValue()
  highlighterSettings.useValue()
  const on = isCurrent(fav)
  const remove = () => {
    const before = penFavourites.get()
    penFavourites.set(removeFavourite(before, fav))
    toast(t('ink.fav.removed'), () => penFavourites.set(before))
  }
  const press = useLongPress(remove)
  const size = 14 + fav.size * 4
  const name = fav.type
    ? `${t(`ink.pen.${fav.type}` as MessageKey)}, ${t(`ink.thickness.${fav.size + 1}` as MessageKey)}`
    : t(`ink.thickness.${fav.size + 1}` as MessageKey)
  return (
    <button
      type="button"
      {...press}
      data-pill-option={`favourite-${n}`}
      data-favourite={fav.colour}
      aria-label={t('ink.fav.use', { n, name })}
      aria-pressed={on}
      onMouseDown={keepFocus}
      onClick={() => applyFavourite(fav)}
      onContextMenu={(e) => {
        e.preventDefault()
        remove()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          remove()
        }
      }}
      className={`${PILL_BUTTON} ${on ? 'bg-hover' : ''}`}
    >
      <span
        aria-hidden
        className={`rounded-full border-2 ${on ? 'border-ink' : 'border-line'}`}
        style={{ width: size, height: size, backgroundColor: fav.colour }}
      />
    </button>
  )
}

export function FavouritesRow({ tool }: { tool: Favourite['tool'] }) {
  const all = penFavourites.useValue()
  const row = favouritesOf(all, tool)
  const save = () => {
    const made = addFavourite(all, currentFavourite(tool))
    if (made.result === 'added') {
      penFavourites.set(made.list)
    } else toast(t(made.result === 'same' ? 'ink.fav.same' : 'ink.fav.full'))
  }
  return (
    <span className="inline-flex shrink-0 items-center" data-favourites>
      <PillButton
        id="favouriteSave"
        label={t('ink.fav.save')}
        icon="star"
        onClick={save}
      />
      {row.map((fav, i) => (
        <Chip
          key={`${fav.colour}-${fav.type}-${fav.size}-${fav.exact}`}
          fav={fav}
          n={i + 1}
        />
      ))}
    </span>
  )
}
