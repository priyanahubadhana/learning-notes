import { memStore } from '../app/tools/store'
import { DEFAULT_ZOOM, PAD_HEIGHT, type Target, type Zoom } from './magnifier'
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
  /** The pad's height as a share of the screen (drag its top edge). */
  height: number
}

export const magnifierTool = memStore<MagnifierTool>({
  on: false,
  zoom: DEFAULT_ZOOM,
  target: null,
  height: PAD_HEIGHT,
})

export const toggleRuler = (): void => {
  const now = rulerTool.get()
  rulerTool.set({ ...now, on: !now.on })
}

export const toggleMagnifier = (): void => {
  const now = magnifierTool.get()
  magnifierTool.set({ ...now, on: !now.on })
}
