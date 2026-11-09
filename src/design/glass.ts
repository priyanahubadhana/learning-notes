/**
 * Glass on or off (docs/design/system.md section 5). `data-glass="lite"` on
 * <html> turns every blur into its solid fallback (tokens.css). It is set by:
 * - the person: Settings > "Reduce glass";
 * - the device: a frame-time probe that sees slow frames while scrolling or
 *   drawing (kept for the session, so the page does not flip back and forth).
 * The paper never blurs, so a big page does not need this on its own.
 */

export const GLASS_CHOICES = ['auto', 'reduce'] as const
export type GlassChoice = (typeof GLASS_CHOICES)[number]

/** A frame slower than this (ms) is "slow" (system.md: 20 ms). */
export const SLOW_FRAME_MS = 20
/** Frames sampled per burst of activity, and slow ones that trip the switch. */
export const SAMPLE_FRAMES = 30
export const SLOW_SHARE = 0.5

export const setGlassLite = (lite: boolean): void => {
  const root = document.documentElement
  if (lite) root.dataset.glass = 'lite'
  else delete root.dataset.glass
}

/** True when more than `SLOW_SHARE` of the frame gaps are over the limit. */
export function framesAreSlow(gaps: readonly number[]): boolean {
  if (gaps.length < SAMPLE_FRAMES) return false
  const slow = gaps.filter((g) => g > SLOW_FRAME_MS).length
  return slow / gaps.length > SLOW_SHARE
}

/**
 * Watches frame times while the person scrolls or draws (scroll and
 * pointer-move bursts); when most frames are slow, glass goes lite until the
 * page is reloaded. Returns a stop function.
 */
export function startGlassProbe(onSlow: () => void): () => void {
  let gaps: number[] = []
  let last = 0
  let raf = 0
  let idle: ReturnType<typeof setTimeout> | undefined
  const tick = (now: number) => {
    if (last) gaps.push(now - last)
    last = now
    if (gaps.length >= SAMPLE_FRAMES) {
      if (framesAreSlow(gaps)) {
        onSlow()
        stop()
        return
      }
      gaps = []
    }
    raf = requestAnimationFrame(tick)
  }
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(tick)
    clearTimeout(idle)
    idle = setTimeout(() => {
      cancelAnimationFrame(raf)
      raf = 0
      last = 0
      gaps = []
    }, 600)
  }
  const opts = { capture: true, passive: true } as const
  window.addEventListener('scroll', wake, opts)
  window.addEventListener('pointermove', wake, opts)
  function stop() {
    window.removeEventListener('scroll', wake, opts)
    window.removeEventListener('pointermove', wake, opts)
    cancelAnimationFrame(raf)
    raf = 0
    clearTimeout(idle)
  }
  return stop
}
