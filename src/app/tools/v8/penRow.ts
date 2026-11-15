import { highlighterSettings, penSettings } from '../main/inkSettings'
import { currentRunner } from '../toolRuntime'
import {
  applyFavourite,
  isCurrent,
  type Favourite,
} from '../main/penFavourites'
import { activeTool } from '../main/mainTools'
import { t } from '../../../i18n/t'
import type { MessageKey } from '../../../i18n/t'
import { isHighlighter, type PenTypeId } from './penFace'

/** Round dot (px) of the Size chip for Thin, Medium, Thick (mock v9, TB-21a). */
export const SIZE_DOT_PX = [6, 9, 13] as const

export const sizeDotPx = (size: 0 | 1 | 2): number => SIZE_DOT_PX[size]

export interface FavItem {
  /** Stable id inside the row: "fav0", "fav1", ... */
  id: string
  fav: Favourite
  typeId: PenTypeId
}

/** The type a favourite draws with: a pen type, or the highlighter. */
export const favTypeId = (f: Favourite): PenTypeId =>
  f.tool === 'highlighter' || f.type === null ? 'highlighter' : f.type

/** The Pen row's favourites, pens and highlighters, in saved order (TB-21c). */
export const penFavItems = (list: readonly Favourite[]): FavItem[] =>
  list.map((fav, i) => ({ id: `fav${i}`, fav, typeId: favTypeId(fav) }))

/**
 * Sets type, size and colour, switches to that pen or highlighter, and says so
 * with an Undo that puts back what was there (TB-21c, TB-51).
 */
export function chooseFavourite(item: FavItem): void {
  const before = {
    pen: penSettings.get(),
    hl: highlighterSettings.get(),
    tool: activeTool.get(),
  }
  applyFavourite(item.fav)
  activeTool.set(item.fav.tool === 'highlighter' ? 'highlighter' : 'pen')
  currentRunner().app?.toast(t('v8.fav.applied', { name: favName(item) }), {
    label: t('v8.bar.undo'),
    icon: 'undo',
    onSelect: () => {
      penSettings.update(before.pen)
      highlighterSettings.update(before.hl)
      activeTool.set(before.tool)
    },
  })
}

/** True while the pen (or highlighter) in use is set exactly like it. */
export const favIsActive = (fav: Favourite, mode: string): boolean =>
  isHighlighter(mode) === (fav.tool === 'highlighter') && isCurrent(fav)

const k = (key: string) => key as MessageKey

export const favName = (f: FavItem): string => t(k(`v8.pen.type.${f.typeId}`))

/** What a screen reader hears: the type and the size. */
export const favLabel = (f: FavItem): string =>
  `${favName(f)}, ${t(k(`v8.pen.size.${f.fav.size}`))}`
