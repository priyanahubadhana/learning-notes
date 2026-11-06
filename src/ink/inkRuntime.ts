import { useSyncExternalStore } from 'react'
import type { Page } from '../core/types'
import type { InkController } from './controller'
import type { InkDoc } from './inkDoc'
import type { InkHistory } from './inkHistory'

/**
 * The ink of the page that is open, reachable from the bar, the cards and
 * Undo/Redo without passing it through every component. One page is open at
 * a time; the surface registers itself here and removes itself on leaving.
 */
export interface InkApi {
  editor: unknown
  controller: InkController
  doc: InkDoc
  history: InkHistory
  /** Keeps a passage in the notebook's Highlights page ("Save to notes"). */
  saveText: (text: string) => void
  /** Sets the paper behind the ink (saved with the page). */
  setPaper: (paper: Page['inkBg']) => void
  paper: () => Page['inkBg']
}

/** Pencil lab: switch single measures off to see what each one does. */
export const inkSwitches = { touchCancel: true }

let current: InkApi | null = null
let tick = 0
const listeners = new Set<() => void>()

export const inkApi = (): InkApi | null => current
export const inkFor = (editor: unknown): InkApi | null =>
  current && current.editor === editor ? current : null

export function registerInk(api: InkApi): () => void {
  current = api
  bumpInk()
  return () => {
    if (current === api) current = null
    bumpInk()
  }
}

/** Tells cards and menus that layers, strokes or the selection changed. */
export function bumpInk(): void {
  tick++
  for (const fn of listeners) fn()
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** The open page's ink; re-renders when it changes. */
export function useInk(): InkApi | null {
  useSyncExternalStore(subscribe, () => tick)
  return current
}
