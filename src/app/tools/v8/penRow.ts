import {
  applyFavourite,
  isCurrent,
  type Favourite,
} from '../main/penFavourites'
import { activeTool } from '../main/mainTools'
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

/** Sets type, size and colour, and switches to that pen or highlighter. */
export function useFavourite(fav: Favourite): void {
  applyFavourite(fav)
  activeTool.set(fav.tool === 'highlighter' ? 'highlighter' : 'pen')
}

/** True while the pen (or highlighter) in use is set exactly like it. */
export const favIsActive = (fav: Favourite, mode: string): boolean =>
  isHighlighter(mode) === (fav.tool === 'highlighter') && isCurrent(fav)
