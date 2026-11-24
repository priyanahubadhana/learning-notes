/**
 * Gate 3 v4 (slice 6, fix 5): on a phone the toast sits above the tab bar.
 * `gap` is the room left above the bar (a toast uses 24, the shell spec;
 * other pop-ups keep 12).
 */
export function aboveTabBar(gap = 12): number | undefined {
  // The bar of spaces (old strip or new tab bar) when it sits at the bottom.
  // The hidden rail also carries data-space: take the bar that is on screen.
  const bar = [...document.querySelectorAll('[data-space]')]
    .map((e) => e.closest('nav'))
    .find((n) => n && n.getBoundingClientRect().height > 0)
  if (!bar) return undefined
  const r = bar.getBoundingClientRect()
  const h = window.innerHeight
  return r.bottom >= h - 2 && r.top > h / 2
    ? Math.round(h - r.top + gap)
    : undefined
}
