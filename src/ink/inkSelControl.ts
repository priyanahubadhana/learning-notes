import { memStore } from '../app/tools/store'

/**
 * What the selection bar (toolbar.v8) can ask of the drawings the Lasso picked
 * (TB-33): the actions that need the page's own services (the picture file,
 * the ink-to-text sheet, the Summary, Make card). The surface fills it in
 * while drawings alone are picked and the new bar is on; null otherwise.
 */
export interface InkSelControl {
  /** Runs one bar action on the picked drawings. */
  run: (id: string) => void
}

export const inkSelControl = memStore<InkSelControl | null>(null)
