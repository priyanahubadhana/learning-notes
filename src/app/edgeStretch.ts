/**
 * Edge feedback (iPad owner, 9 Nov): pull a list, panel or page past its top
 * or bottom and the content gives a few pixels, then springs back (200 ms).
 * It is only a CSS transform on the scroller's children while a finger or the
 * wheel keeps pulling; the browser's own bounce stays off
 * (`overscroll-behavior: none` on the page, so the old ink drift cannot
 * return). On the paper page the ink overlay lives inside the scroller, so it
 * moves with the words. With Reduce motion the content stays still and the
 * edge glows briefly instead (`data-edge-glow`, CSS in index.css).
 */

/** The most the content may give (px). */
export const MAX_STRETCH = 14
const SPRING_MS = 200
const WHEEL_IDLE_MS = 140

/** Pure: how far the content gives for a pull of `pull` px. Soft limit. */
export function rubberBand(pull: number, max = MAX_STRETCH): number {
  if (pull <= 0) return 0
  return max * (1 - Math.exp(-pull / (max * 4)))
}

/** Pure: which edge a pull in direction `dy` meets, if any. */
export function edgeOf(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  dy: number,
): 'top' | 'bottom' | null {
  if (dy > 0 && scrollTop <= 0) return 'top'
  if (dy < 0 && scrollTop >= scrollHeight - clientHeight - 1) return 'bottom'
  return null
}

/** The nearest box around `from` that really scrolls up and down. */
function scrollerAt(from: EventTarget | null): HTMLElement | null {
  let el = from instanceof Element ? from : null
  while (el) {
    if (
      el instanceof HTMLElement &&
      el !== document.body &&
      el !== document.documentElement &&
      el.scrollHeight - el.clientHeight > 1 &&
      !el.hasAttribute('data-no-stretch')
    ) {
      const o = getComputedStyle(el).overflowY
      if (o === 'auto' || o === 'scroll') return el
    }
    el = el.parentElement
  }
  return null
}

const reduced = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

function kids(el: HTMLElement): HTMLElement[] {
  return [...el.children].filter(
    (c): c is HTMLElement =>
      c instanceof HTMLElement &&
      getComputedStyle(c).position !== 'fixed' &&
      !c.hasAttribute('data-no-stretch'),
  )
}

/** Starts the stretch. Returns the function that stops it. */
export function installEdgeStretch(): () => void {
  let target: HTMLElement | null = null
  let moved: HTMLElement[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  let wheelPull = 0
  /** Touch: where the pull began (first move past the edge). */
  let startY = 0
  let edgeY: number | null = null
  let wheelEl: HTMLElement | null = null

  const glow = (el: HTMLElement, edge: 'top' | 'bottom') => {
    el.setAttribute('data-edge-glow', edge)
    clearTimeout(timer)
    timer = setTimeout(() => el.removeAttribute('data-edge-glow'), 450)
  }

  const apply = (el: HTMLElement, edge: 'top' | 'bottom', pull: number) => {
    if (reduced()) {
      if (el.getAttribute('data-edge-glow') !== edge) glow(el, edge)
      return
    }
    if (target !== el) {
      release()
      target = el
      moved = kids(el)
    }
    const d = rubberBand(pull) * (edge === 'top' ? 1 : -1)
    for (const c of moved) {
      c.style.transition = 'none'
      c.style.transform = `translate3d(0, ${d.toFixed(1)}px, 0)`
    }
  }

  function release(): void {
    const list = moved
    moved = []
    target = null
    edgeY = null
    wheelPull = 0
    wheelEl = null
    if (!list.length) return
    for (const c of list) {
      c.style.transition = `transform ${SPRING_MS}ms ease`
      c.style.transform = 'translate3d(0, 0, 0)'
    }
    // Back at rest the transform goes away entirely, so nothing stays a
    // containing block for fixed pop-ups.
    setTimeout(() => {
      for (const c of list) {
        if (c.style.transform === 'translate3d(0px, 0px, 0px)') {
          c.style.transform = ''
          c.style.transition = ''
        }
      }
    }, SPRING_MS + 40)
  }

  const onStart = (e: TouchEvent) => {
    release()
    const t = e.touches[0]
    // The Pencil draws and selects; only a finger pulls.
    if (
      e.touches.length !== 1 ||
      !t ||
      (t as { touchType?: string }).touchType === 'stylus'
    )
      return
    startY = t.clientY
    edgeY = null
    target = null
    wheelEl = scrollerAt(e.target)
  }
  const onMove = (e: TouchEvent) => {
    const t = e.touches[0]
    const el = wheelEl
    if (!t || !el || e.touches.length !== 1) return
    const dy = t.clientY - startY
    const edge = edgeOf(el.scrollTop, el.scrollHeight, el.clientHeight, dy)
    if (!edge) {
      if (target) release()
      // The finger moved on inside the list: measure again from here.
      startY = t.clientY
      edgeY = null
      return
    }
    if (edgeY === null) edgeY = startY
    apply(el, edge, Math.abs(t.clientY - edgeY))
  }
  const onEnd = () => {
    release()
    wheelEl = null
  }

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
    const el = scrollerAt(e.target)
    if (!el) return
    const edge = edgeOf(
      el.scrollTop,
      el.scrollHeight,
      el.clientHeight,
      -e.deltaY,
    )
    if (!edge) {
      if (target) release()
      return
    }
    if (wheelEl !== el) wheelPull = 0
    wheelEl = el
    wheelPull += Math.abs(e.deltaY) * 0.6
    apply(el, edge, wheelPull)
    clearTimeout(timer)
    timer = setTimeout(release, WHEEL_IDLE_MS)
  }

  const opts = { capture: true, passive: true } as const
  document.addEventListener('touchstart', onStart, opts)
  document.addEventListener('touchmove', onMove, opts)
  document.addEventListener('touchend', onEnd, opts)
  document.addEventListener('touchcancel', onEnd, opts)
  document.addEventListener('wheel', onWheel, opts)
  return () => {
    document.removeEventListener('touchstart', onStart, true)
    document.removeEventListener('touchmove', onMove, true)
    document.removeEventListener('touchend', onEnd, true)
    document.removeEventListener('touchcancel', onEnd, true)
    document.removeEventListener('wheel', onWheel, true)
    clearTimeout(timer)
    release()
  }
}
