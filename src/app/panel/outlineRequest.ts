import { memStore } from '../tools/store'

/**
 * The reader's Contents (☰) asks the left panel to open on its Outline tab
 * (one outline, one place); the reader's Notes button asks for the Notes tab
 * of an open book. `at` lets a panel that mounts because of the request tell
 * it from an old one.
 */
export type PanelAsk = 'outline' | 'annotations' | 'audio'
export const outlineRequest = memStore<{
  n: number
  at: number
  tab: PanelAsk
}>({
  n: 0,
  at: 0,
  tab: 'outline',
})

export function requestOutline(tab: PanelAsk = 'outline'): void {
  outlineRequest.set({ n: outlineRequest.get().n + 1, at: Date.now(), tab })
}
