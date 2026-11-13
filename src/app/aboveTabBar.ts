/** Gate 3 v4 (slice 6, fix 5): on a phone the toast sits above the tab bar. */
export function aboveTabBar(): number | undefined {
  // The bar of spaces (old strip or new tab bar) when it sits at the bottom.
  const bar = document.querySelector('[data-space]')?.closest('nav')
  if (!bar) return undefined
  const r = bar.getBoundingClientRect()
  const h = window.innerHeight
  return r.bottom >= h - 2 && r.top > h / 2
    ? Math.round(h - r.top + 12)
    : undefined
}
