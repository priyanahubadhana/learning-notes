import { createExtension } from '@blocknote/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view'

/**
 * Sheets and the gap between them (iPad finding, 9 Nov). A box's text is one
 * continuous flow, but the paper is sheets with a gap: a line must never sit
 * in the gap or across a sheet's bottom margin. Each top-level block that
 * would reach the bottom margin (or starts in the margin or gap) is pushed
 * down to the top of the next sheet; a block is never split, so a line is
 * never cut. A block taller than a whole sheet is the one exception (it is
 * left to cross). Pure maths; `applyPagination` does the DOM.
 */

export interface SheetGeometry {
  /** Top of the first sheet and height of every sheet (same unit as blocks). */
  top: number
  height: number
  gap: number
  /** Free space kept at the bottom and at the top of a sheet. */
  bottomMargin: number
  topMargin: number
}

/** Top of the content area of sheet `n` (0 based) and where it ends. */
const area = (g: SheetGeometry, n: number) => {
  const top = g.top + n * (g.height + g.gap)
  return { top: top + g.topMargin, end: top + g.height - g.bottomMargin }
}

/**
 * How far (px) each block must be pushed down, one number per block, in
 * order. `blocks` are the NATURAL positions (nothing pushed yet). Pushes add
 * up: a block pushed down takes every block after it along.
 */
export function pushes(
  blocks: readonly { top: number; height: number }[],
  g: SheetGeometry,
): number[] {
  const out: number[] = []
  let acc = 0
  const room = g.height - g.topMargin - g.bottomMargin
  for (const b of blocks) {
    const top = b.top + acc
    const bottom = top + b.height
    // The sheet this block starts on (or the gap under it).
    let n = Math.max(
      0,
      Math.floor((top - g.top + g.gap) / (g.height + g.gap) - 1e-9),
    )
    if (top < g.top) n = 0
    const a = area(g, n)
    let push = 0
    const inMargin = top >= a.end - 0.5
    const crosses = bottom > a.end + 0.5 && b.height <= room
    if (inMargin || crosses) push = Math.max(0, area(g, n + 1).top - top)
    out.push(push)
    acc += push
  }
  return out
}

// ---- The editor side: the pushes are ProseMirror decorations (a style set
// by hand on a block would be wiped when the editor redraws it) ----

const key = new PluginKey<Map<string, number>>('ln-pagination')
const views = new Map<HTMLElement, EditorView>()

/** Decorations: margin-top (CSS px) on the blocks listed in the plugin state. */
export const pagination = createExtension({
  key: 'learning-notes-pagination',
  prosemirrorPlugins: [
    new Plugin<Map<string, number>>({
      key,
      state: {
        init: () => new Map(),
        apply: (tr, old) => tr.getMeta(key) ?? old,
      },
      props: {
        decorations(state) {
          const map = key.getState(state)
          if (!map || map.size === 0) return DecorationSet.empty
          const found: Decoration[] = []
          state.doc.descendants((node, pos) => {
            if (node.type.name !== 'blockContainer') return true
            const px = map.get(node.attrs.id as string)
            if (px) {
              found.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  style: `margin-top: ${px}px`,
                }),
              )
            }
            return false
          })
          return DecorationSet.create(state.doc, found)
        },
      },
      view: (view) => {
        views.set(view.dom as HTMLElement, view)
        return { destroy: () => views.delete(view.dom as HTMLElement) }
      },
    }),
  ],
})

const idOf = (outer: HTMLElement) =>
  outer.querySelector(':scope > .bn-block')?.getAttribute('data-id') ?? ''

/**
 * Pushes the top-level blocks of one editor down so no line sits in the gap
 * or the bottom margin. `sheet0` is the first sheet's client rect. Returns
 * true if anything changed.
 */
export function applyPagination(
  editorEl: HTMLElement,
  sheet0: DOMRect,
  gapPx: number,
  bottomMargin: number,
  topMargin: number,
): boolean {
  const view = views.get(editorEl)
  if (!view) return false
  const outers = Array.from(
    editorEl.querySelectorAll<HTMLElement>(
      ':scope > .bn-block-group > .bn-block-outer',
    ),
  )
  if (outers.length === 0) return false
  // CSS zoom on the editor's ancestor: CSS px are bigger on screen.
  const scale = editorEl.offsetWidth
    ? editorEl.getBoundingClientRect().width / editorEl.offsetWidth
    : 1
  const had = key.getState(view.state) ?? new Map<string, number>()
  // Natural positions: what is measured minus the pushes already applied.
  let applied = 0
  const ids = outers.map(idOf)
  const natural = outers.map((el, i) => {
    applied += (had.get(ids[i]) ?? 0) * scale
    const r = el.getBoundingClientRect()
    return { top: r.top - applied, height: r.height }
  })
  const want = pushes(natural, {
    top: sheet0.top,
    height: sheet0.height,
    gap: gapPx,
    bottomMargin,
    topMargin,
  })
  const next = new Map<string, number>()
  let changed = false
  ids.forEach((id, i) => {
    const css = Math.round(want[i] / scale)
    if (css > 0 && id) next.set(id, css)
    if (Math.abs(css - (had.get(id) ?? 0)) >= 1) changed = true
  })
  if (!changed) return false
  view.dispatch(view.state.tr.setMeta(key, next).setMeta('addToHistory', false))
  return true
}

/** Takes every push away (the paper is not in sheets: fit width, the reader). */
export function clearPagination(editorEl: HTMLElement): void {
  const view = views.get(editorEl)
  if (!view || (key.getState(view.state)?.size ?? 0) === 0) return
  view.dispatch(
    view.state.tr.setMeta(key, new Map()).setMeta('addToHistory', false),
  )
}
