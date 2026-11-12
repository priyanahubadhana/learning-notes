/** True when motion should be skipped (system setting or the gallery switch). */
export function reducedMotion(): boolean {
  if (typeof document !== 'undefined') {
    if (document.documentElement.dataset.motion === 'reduce') return true
  }
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    return false
  }
}

/** Milliseconds to wait for a CSS animation of `ms`: 0 when motion is reduced. */
export const motionMs = (ms: number): number => (reducedMotion() ? 0 : ms)
