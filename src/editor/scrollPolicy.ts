import type { EditorView } from 'prosemirror-view'

/**
 * Where the page scrolls when the caret would be hidden (Phase A4). The
 * browser's own "scroll the caret into view" also moves the document and
 * jumps when the keyboard opens. This policy scrolls only the page column,
 * only if the caret is outside the visible part (less the keyboard), by the
 * smallest amount, with no animation. When nothing is hidden nothing moves.
 */

export const REVEAL_MARGIN = 24

/** How far to scroll (px, positive = down) to bring [top, bottom] into [viewTop, viewBottom]. */
export function revealDelta(
  caret: { top: number; bottom: number },
  view: { top: number; bottom: number },
  margin = REVEAL_MARGIN,
): number {
  if (caret.top < view.top + margin) return caret.top - (view.top + margin)
  if (caret.bottom > view.bottom - margin) {
    return caret.bottom - (view.bottom - margin)
  }
  return 0
}

/** The visible part of the page column: its box cut by the visual viewport. */
function visibleBox(scroller: HTMLElement) {
  const r = scroller.getBoundingClientRect()
  const vv = window.visualViewport
  const bottom = vv ? Math.min(r.bottom, vv.offsetTop + vv.height) : r.bottom
  return { top: Math.max(r.top, vv?.offsetTop ?? 0), bottom }
}

/** ProseMirror `handleScrollToSelection`: true = handled here. */
export function handleScrollToSelection(view: EditorView): boolean {
  const scroller = view.dom.closest<HTMLElement>('[data-page-scroller]')
  if (!scroller) return false // no page column (a test): the default
  try {
    const caret = view.coordsAtPos(view.state.selection.head)
    const delta = revealDelta(caret, visibleBox(scroller))
    if (delta !== 0) scroller.scrollTop += delta
  } catch {
    // A position the view cannot measure yet: leave the page where it is.
  }
  return true
}
