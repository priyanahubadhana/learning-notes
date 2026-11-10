import type { Editor } from '../barActions'

/** Space kept between the insertion line and the top of the pad. */
const GAP = 24

/** The nearest scrolling ancestor of an element (or null: the window). */
function scroller(el: HTMLElement | null): HTMLElement | null {
  let sp = el
  while (
    sp &&
    !(
      sp.scrollHeight > sp.clientHeight + 1 &&
      /(auto|scroll)/.test(getComputedStyle(sp).overflowY)
    )
  )
    sp = sp.parentElement
  return sp
}

/**
 * How far the page must scroll so a line at `top..bottom` sits clear above
 * the pad (limit = pad top - gap) and below the top edge. 0 = already fine.
 */
export function scrollDelta(top: number, bottom: number, limit: number) {
  if (bottom > limit) return bottom - limit
  if (top < 0) return top
  return 0
}

/**
 * Item 13: when the Write pad opens, scroll the page so the insertion point
 * is visible above the pad before anything is written. Same rule as the live
 * ghost (ghost.ts), but it works from the document position.
 */
export function revealInsertion(editor: Editor, pos: number): void {
  const view = editor.prosemirrorView
  const padEl = document.querySelector('[data-write-pad]')
  if (!view || !padEl) return
  let r: { top: number; bottom: number }
  try {
    r = view.coordsAtPos(
      Math.max(0, Math.min(view.state.doc.content.size, pos)),
    )
  } catch {
    return
  }
  const limit = padEl.getBoundingClientRect().top - GAP
  const delta = scrollDelta(r.top, r.bottom, limit)
  if (delta === 0) return
  const sp = scroller(view.dom as HTMLElement)
  if (sp) sp.scrollTop += delta
  else window.scrollBy(0, delta)
}
