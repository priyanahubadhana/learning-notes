import { memStore } from '../tools/store'

/**
 * The reader's Contents (☰) asks the left panel to open on its Outline tab
 * (one outline, one place). `at` lets a panel that mounts because of the
 * request tell it from an old one.
 */
export const outlineRequest = memStore<{ n: number; at: number }>({
  n: 0,
  at: 0,
})

export function requestOutline(): void {
  outlineRequest.set({ n: outlineRequest.get().n + 1, at: Date.now() })
}
