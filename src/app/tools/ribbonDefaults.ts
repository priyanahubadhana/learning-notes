import { ribbonFreePos } from './freeBar'
import { ribbonMode, ribbonPlace, ribbonSize } from './toolbarState'

/** Back to the ribbon defaults (replaces the short bar, Full, same place). */
export function resetRibbonOptions(): void {
  ribbonMode.set('replace')
  ribbonSize.set('full')
  ribbonPlace.set('same')
  ribbonFreePos.set({ fx: 0.5, fy: 0.9 })
}
