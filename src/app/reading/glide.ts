/**
 * Jumps inside a long page (B2): from Contents, Bookmarks, search results
 * and deep links. Every jump glides for the SAME time whatever the
 * distance, a very long one first leaps to 1.5 screens away and then
 * glides, a touch stops it, and the target glows when you arrive.
 */

export const DEFAULT_GLIDE_MS = 1200
/** How long the glow around the arrival point shows. */
export const LANDING_MS = 1600
/** The id of the glow animation (tests look for it). */
export const LANDING_ID = 'ln-landing'
/** Where the target ends up, as a share of the visible height from the top. */
export const TARGET_OFFSET = 0.25

export const easeInOutCubic = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

/** What stops a glide: the person touches, scrolls or types. */
const STOP_EVENTS = ['pointerdown', 'wheel', 'touchstart', 'keydown'] as const

export interface GlideOptions {
  /** The clock (tests pass a fake one). */
  now?: () => number
  /** The frame timer (tests pass a fake one). */
  raf?: (fn: () => void) => unknown
  /** Skip the animation (reduced motion). */
  instant?: boolean
}

export interface Glide {
  cancel: () => void
  /** Resolves when the glide ended or was stopped. */
  done: Promise<void>
}

/**
 * Where the scroller should stop to put `el` a quarter of the way down.
 * `el` must be inside `scroller`.
 */
export function targetTopFor(scroller: HTMLElement, el: HTMLElement): number {
  const s = scroller.getBoundingClientRect()
  const e = el.getBoundingClientRect()
  const top = scroller.scrollTop + (e.top - s.top)
  return Math.max(0, top - scroller.clientHeight * TARGET_OFFSET)
}

/**
 * Scrolls `scroller` to `targetTop` in `ms` (easeInOutCubic). A distance of
 * more than 1.5 screens first leaps so that only 1.5 screens are left.
 */
export function glideTo(
  scroller: HTMLElement,
  targetTop: number,
  ms: number = DEFAULT_GLIDE_MS,
  options: GlideOptions = {},
): Glide {
  const now = options.now ?? (() => performance.now())
  const raf =
    options.raf ?? ((fn: () => void) => requestAnimationFrame(() => fn()))
  let stopped = false
  let finish: () => void = () => {}
  const done = new Promise<void>((resolve) => {
    finish = resolve
  })
  const remove = () => {
    for (const e of STOP_EVENTS) scroller.removeEventListener(e, stop, true)
  }
  function stop() {
    if (stopped) return
    stopped = true
    remove()
    finish()
  }
  if (options.instant || ms <= 0) {
    scroller.scrollTop = targetTop
    finish()
    return { cancel: () => {}, done }
  }
  const reach = scroller.clientHeight * 1.5
  const from0 = scroller.scrollTop
  if (Math.abs(targetTop - from0) > reach) {
    scroller.scrollTop = targetTop + (from0 < targetTop ? -reach : reach)
  }
  const from = scroller.scrollTop
  const started = now()
  // A touch, wheel or key stops the glide (our own scrolling is not one).
  for (const e of STOP_EVENTS) scroller.addEventListener(e, stop, true)
  const step = () => {
    if (stopped) return
    const x = Math.min(1, (now() - started) / ms)
    scroller.scrollTop = from + (targetTop - from) * easeInOutCubic(x)
    if (x >= 1) {
      stopped = true
      remove()
      finish()
      return
    }
    raf(step)
  }
  raf(step)
  return { cancel: stop, done }
}

/**
 * Makes the arrival point glow for a moment. A Web Animation, not a CSS
 * class: the editor redraws its own elements and would drop a class (the
 * same reason revealBlock uses one). Reduced motion: a still outline.
 */
export function landOn(el: HTMLElement): void {
  const reduce = prefersReducedMotion()
  const on = 'color-mix(in srgb, var(--color-accent, #2f6fed) 55%, transparent)'
  const off = 'transparent'
  const frame = (colour: string) => ({
    outline: `3px solid ${colour}`,
    outlineOffset: '3px',
  })
  el.animate(
    reduce
      ? [frame(on), { ...frame(on), offset: 0.95 }, frame(off)]
      : [frame(on), { ...frame(on), offset: 0.3 }, frame(off)],
    {
      duration: reduce ? 1500 : LANDING_MS,
      easing: 'ease-out',
      id: LANDING_ID,
    },
  )
}

/** True when the person asked the device for less motion. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
