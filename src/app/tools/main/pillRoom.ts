import type { Box } from './pillPlace'

export const MARGIN = 8
/** Space between the main bar and a pill that sits against it. */
export const BAR_GAP = 4
export const reducedMotion = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The room the pill may use: the page area between the docked bars. A pill on
 * the edge next to the main bar sits right against it.
 */
export function measureRoom(): Box {
  const main = document.querySelector('main')?.getBoundingClientRect()
  const vv = window.visualViewport
  const vTop = vv?.offsetTop ?? 0
  const vHeight = vv?.height ?? window.innerHeight
  let top = Math.max(main?.top ?? 0, vTop) + MARGIN
  let bottom = vTop + vHeight - MARGIN
  const row = document.querySelector('[data-main-bar]')
  const dock = row?.closest<HTMLElement>('[data-bar="docked"]')
  const rect = row?.getBoundingClientRect()
  if (rect && dock?.dataset.placement === 'top') {
    top = rect.bottom + BAR_GAP
  } else if (rect && dock?.dataset.placement === 'bottom') {
    bottom = Math.min(bottom + MARGIN, rect.top) - BAR_GAP
  } else {
    // Another docked bar (the ribbon) keeps its room.
    const dockTop = document.querySelector(
      '[data-bar="docked"][data-placement="top"]',
    )
    if (dockTop)
      top = Math.max(top, dockTop.getBoundingClientRect().bottom + BAR_GAP)
    const dockBottom = document.querySelector(
      '[data-bar="docked"][data-placement="bottom"]',
    )
    if (dockBottom) {
      bottom = Math.min(
        bottom,
        dockBottom.getBoundingClientRect().top - BAR_GAP,
      )
    }
  }
  const left = main?.left ?? 0
  const right = main?.right ?? window.innerWidth
  return {
    left: left + MARGIN,
    top,
    width: Math.max(120, right - left - 2 * MARGIN),
    height: Math.max(120, bottom - top),
  }
}
