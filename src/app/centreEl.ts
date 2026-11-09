const watchers = new WeakMap<HTMLElement, ResizeObserver>()

/**
 * Centres a box on its `left` by a whole-pixel negative margin instead of
 * `translateX(-50%)`: half a width is often a fraction, and a transformed
 * layer with a fractional offset draws its text soft on iPad. Use as `ref`.
 */
export function centreEl(el: HTMLElement | null): void {
  if (!el) return
  const set = () => {
    el.style.marginLeft = `${-Math.round(el.offsetWidth / 2)}px`
  }
  set()
  if (watchers.has(el) || typeof ResizeObserver === 'undefined') return
  const ro = new ResizeObserver(set)
  ro.observe(el)
  watchers.set(el, ro)
}
