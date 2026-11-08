import { cleanStore } from '../store'
import {
  PEN_TYPES,
  highlighterSettings,
  penSettings,
  type PenType,
} from './inkSettings'

/**
 * Pen favourites (polish 2, item 5): up to six saved pens and six saved
 * highlighters, each a type, a colour and a size. A tap on one sets the pen
 * (or highlighter) to it. They are saved on the device and travel with the
 * bar layout (layoutSync.ts), so no new table.
 */

export const MAX_FAVOURITES = 6

export interface Favourite {
  tool: 'pen' | 'highlighter'
  /** The pen type (pens only). */
  type: PenType | null
  colour: string
  size: 0 | 1 | 2
  /** An exact pen width in px, or null (use the size). */
  exact: number | null
}

const HEX = /^#[0-9a-fA-F]{3,8}$/
const isSize = (v: unknown): v is 0 | 1 | 2 => v === 0 || v === 1 || v === 2

/** One saved favourite, or undefined when it is not usable. */
function cleanOne(v: unknown): Favourite | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const f = v as Record<string, unknown>
  if (f.tool !== 'pen' && f.tool !== 'highlighter') return undefined
  if (typeof f.colour !== 'string' || !HEX.test(f.colour)) return undefined
  const type =
    f.tool === 'pen' && (PEN_TYPES as readonly unknown[]).includes(f.type)
      ? (f.type as PenType)
      : null
  if (f.tool === 'pen' && type === null) return undefined
  const exact =
    typeof f.exact === 'number' && f.exact >= 0.5 && f.exact <= 30
      ? f.exact
      : null
  return {
    tool: f.tool,
    type,
    colour: f.colour,
    size: isSize(f.size) ? f.size : 1,
    exact,
  }
}

const same = (a: Favourite, b: Favourite) =>
  a.tool === b.tool &&
  a.type === b.type &&
  a.colour.toLowerCase() === b.colour.toLowerCase() &&
  a.size === b.size &&
  a.exact === b.exact

/** A saved list, cleaned: bad entries and repeats drop out, six per tool. */
export function cleanFavourites(v: unknown): Favourite[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: Favourite[] = []
  for (const raw of v) {
    const f = cleanOne(raw)
    if (!f || out.some((o) => same(o, f))) continue
    if (out.filter((o) => o.tool === f.tool).length >= MAX_FAVOURITES) continue
    out.push(f)
  }
  return out
}

export const penFavourites = cleanStore<Favourite[]>(
  'toolbar.favourites',
  cleanFavourites,
  [],
)

export type AddResult = 'added' | 'same' | 'full'

/** Adds a favourite at the end of its tool's row. */
export function addFavourite(
  list: readonly Favourite[],
  fav: Favourite,
): { list: Favourite[]; result: AddResult } {
  if (list.some((f) => same(f, fav))) return { list: [...list], result: 'same' }
  if (list.filter((f) => f.tool === fav.tool).length >= MAX_FAVOURITES) {
    return { list: [...list], result: 'full' }
  }
  return { list: [...list, fav], result: 'added' }
}

export const removeFavourite = (
  list: readonly Favourite[],
  fav: Favourite,
): Favourite[] => list.filter((f) => !same(f, fav))

/** The row of one tool, in the order saved. */
export const favouritesOf = (
  list: readonly Favourite[],
  tool: Favourite['tool'],
): Favourite[] => list.filter((f) => f.tool === tool)

/** The current pen or highlighter as a favourite. */
export function currentFavourite(tool: Favourite['tool']): Favourite {
  if (tool === 'pen') {
    const p = penSettings.get()
    return {
      tool,
      type: p.type,
      colour: p.colour,
      size: p.size,
      exact: p.exact,
    }
  }
  const h = highlighterSettings.get()
  return { tool, type: null, colour: h.colour, size: h.size, exact: null }
}

/** Sets the pen or highlighter to a favourite. */
export function applyFavourite(fav: Favourite): void {
  if (fav.tool === 'pen' && fav.type) {
    penSettings.update({
      type: fav.type,
      colour: fav.colour,
      size: fav.size,
      exact: fav.exact,
    })
  } else {
    highlighterSettings.update({ colour: fav.colour, size: fav.size })
  }
}

/** True when the pen or highlighter is set exactly like this favourite. */
export const isCurrent = (fav: Favourite): boolean =>
  same(fav, currentFavourite(fav.tool))
