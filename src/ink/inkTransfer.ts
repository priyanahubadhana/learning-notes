import type { Stroke } from '../core/inkTypes'
import type { Pt } from './geometry'

/**
 * Phase Q rule 5: ink the Lasso drops outside its box moves to the box
 * under the drop spot, or to a new box made there on the paper. Each box
 * has its own ink engine; this is how they hand strokes to each other.
 * Points travel in client px (where they are on screen now).
 */

export interface Carried {
  stroke: Stroke
  client: Pt[]
}

/**
 * Rule 6 across boxes: the Lasso-selected lines go with their ink. `blocks`
 * are the lines without ids; `refY` is where the first line's top lands on
 * screen at the drop (client px), so the ink keeps its place on the lines.
 */
export interface CarriedLines {
  blocks: unknown[]
  refY: number
}

interface Adopter {
  wrap: HTMLElement
  adopt: (items: Carried[], lines?: CarriedLines) => void
  /** Rule 9: these lines were copied (or cut): their ink goes with them. */
  copyLines: (ids: string[], text: string, cut: boolean) => void
  /** Lines whose words the page selection covers in full. */
  wholeLines: () => string[]
  /** Rule 9: runs a paste of this text and links the copied ink to the new lines. */
  pasteLines: (text: string | null, run?: () => void) => void
}

const adopters = new Set<Adopter>()

/** An ink engine that can take strokes; returns the unregister. */
export function registerAdopter(a: Adopter): () => void {
  adopters.add(a)
  return () => adopters.delete(a)
}

/** The engine of a box whose area holds this point (client px). */
export function adopterAt(
  x: number,
  y: number,
  not?: HTMLElement,
): Adopter | null {
  for (const a of adopters) {
    if (a.wrap === not || !a.wrap.isConnected) continue
    const r = a.wrap.getBoundingClientRect()
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return a
  }
  return null
}

/** The engine of the editor holding this element (or inside it, a paper box). */
export function adopterIn(el: Element): Adopter | null {
  for (const a of adopters)
    if (el.contains(a.wrap) || a.wrap.contains(el)) return a
  return null
}

type PaperDrop = (items: Carried[], lines?: CarriedLines) => boolean
let paperDrop: PaperDrop | null = null

/** The paper registers how it makes a box for dropped ink. */
export function setPaperDrop(fn: PaperDrop | null): void {
  paperDrop = fn
}

/** Makes a box under the ink on the paper; false when there is no paper. */
export const dropOnPaper = (items: Carried[], lines?: CarriedLines): boolean =>
  paperDrop ? paperDrop(items, lines) : false
