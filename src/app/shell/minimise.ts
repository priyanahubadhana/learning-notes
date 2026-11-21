import { prefStore } from '../tools/store'

const isIds = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

export type EdgeSide = 'left' | 'right'
export interface EdgePlace {
  side: EdgeSide
  /** 0 to 1 down the window. */
  at: number
}
const isPlace = (v: unknown): v is EdgePlace =>
  typeof v === 'object' &&
  v !== null &&
  ((v as EdgePlace).side === 'left' || (v as EdgePlace).side === 'right') &&
  typeof (v as EdgePlace).at === 'number'

/** Which bars are minimised (remembered on this device; it replaces `ln-shell-v1`). */
export const minimisedBars = prefStore('shell.minimised', isIds, [])
/** The person has minimised a bar once, so the hint pulse stops. */
export const minimiseUsed = prefStore('shell.minimiseUsed', isBool, false)
/** Where the edge handle was left. */
export const edgePlace = prefStore<EdgePlace>('shell.edgePlace', isPlace, {
  side: 'right',
  at: 0.4,
})

export function minimiseBar(id: string): void {
  const list = minimisedBars.get()
  if (!list.includes(id)) minimisedBars.set([...list, id])
  minimiseUsed.set(true)
}

export function restoreBar(id: string): void {
  minimisedBars.set(minimisedBars.get().filter((x) => x !== id))
}

export const useMinimised = (id: string): boolean =>
  minimisedBars.useValue().includes(id)

/** First pulse after 45 s, then every 3 minutes, until a bar was minimised once. */
export const FIRST_PULSE_MS = 45_000
export const NEXT_PULSE_MS = 180_000
/** How long one pulse lasts. */
export const PULSE_MS = 2_400

/** The snap side for a drop at `x` in a window `width` wide. */
export const snapSide = (x: number, width: number): EdgeSide =>
  x < width / 2 ? 'left' : 'right'

/** Keeps the handle inside 8% to 92% of the window height. */
export const clampAt = (at: number): number =>
  Math.min(0.92, Math.max(0.08, at))
