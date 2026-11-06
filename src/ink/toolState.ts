import { memStore } from '../app/tools/store'
import type { Target, Zoom } from './magnifier'
import type { RulerState } from './ruler'

/**
 * Where the Ruler and the Magnifier are. Kept while the app is open, never
 * saved with the notes (they are tools, not content). A null position means
 * "place it where the page is on screen" (the surface does that).
 */
export interface RulerTool {
  on: boolean
  ruler: RulerState | null
}

export const rulerTool = memStore<RulerTool>({ on: false, ruler: null })

export interface MagnifierTool {
  on: boolean
  zoom: Zoom
  target: Target | null
}

export const magnifierTool = memStore<MagnifierTool>({
  on: false,
  zoom: 3,
  target: null,
})

export const toggleRuler = (): void => {
  const now = rulerTool.get()
  rulerTool.set({ ...now, on: !now.on })
}

export const toggleMagnifier = (): void => {
  const now = magnifierTool.get()
  magnifierTool.set({ ...now, on: !now.on })
}
