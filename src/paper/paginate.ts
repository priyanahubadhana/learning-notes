import { createExtension } from '@blocknote/core'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import { t } from '../i18n/t'
import type { Node as PMNode } from 'prosemirror-model'
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view'

/** One text line of a block, as measured (client px). */
export interface LineRect {
  top: number
  height: number
  left: number
}

/**
 * Joins the client rects of a block's text into lines: rects whose middles
 * fall inside one line are that line. Sorted top to bottom.
 */
export function groupLines(
  rects: readonly { top: number; bottom: number; left: number }[],
): LineRect[] {
  const lines: { top: number; bottom: number; left: number }[] = []
  for (const r of [...rects].sort((a, b) => a.top - b.top || a.left - b.left)) {
    if (r.bottom - r.top < 1) continue
    const mid = (r.top + r.bottom) / 2
    const hit = lines.find((l) => mid > l.top + 1 && mid < l.bottom - 1)
    if (hit) {
      hit.top = Math.min(hit.top, r.top)
      hit.bottom = Math.max(hit.bottom, r.bottom)
      hit.left = Math.min(hit.left, r.left)
    } else lines.push({ ...r })
  }
  return lines.map((l) => ({
    top: l.top,
    height: l.bottom - l.top,
    left: l.left,
  }))
}

/**
 * Sheets and the gap between them (iPad finding, 9 Nov). A box's text is one
 * continuous flow, but the paper is sheets with a gap: a line must never sit
 * in the gap or across a sheet's bottom margin. Each top-level block that
 * would reach the bottom margin (or starts in the margin or gap) is pushed
 * down to the top of the next sheet; a block is never split, so a line is
 * never cut. A block taller than a whole sheet cannot move as one: it is split
 * for display at line boundaries (a spacer before the first line that would
 * reach the margin), so no line sits in the gap either. Pure maths;
 * `applyPagination` does the DOM.
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

const key = new PluginKey<Pushes>('ln-pagination')
const views = new Map<HTMLElement, EditorView>()

/** The pushes and, built once from them, the decorations that draw them. */
interface Pushes {
  map: Map<string, number>
  deco: DecorationSet
}

const buildPushes = (doc: PMNode, map: Map<string, number>): Pushes => {
  if (map.size === 0) return { map, deco: DecorationSet.empty }
  const found: Decoration[] = []
  doc.descendants((node, pos) => {
    if (node.type.name !== 'blockContainer') return true
    const px = map.get(node.attrs.id as string)
    if (px) {
      found.push(
        Decoration.node(pos, pos + node.nodeSize, {
          style: `margin-top: ${px}px; --ln-push: ${px}px`,
          class: 'ln-pushed',
          'data-continues': t('paper.continues'),
        }),
      )
    }
    return false
  })
  return { map, deco: DecorationSet.create(doc, found) }
}

/**
 * Decorations: margin-top (CSS px) on the blocks listed in the plugin state.
 * Built only when the pushes change; while typing they are mapped through the
 * edit (a walk over every block, on every key, was slow on big pages).
 */
export const pagination = createExtension({
  key: 'learning-notes-pagination',
  prosemirrorPlugins: [
    new Plugin<Pushes>({
      key,
      state: {
        init: () => ({ map: new Map(), deco: DecorationSet.empty }),
        apply: (tr, old, _before, after) => {
          const meta = tr.getMeta(key) as Map<string, number> | undefined
          if (meta) return buildPushes(after.doc, meta)
          if (!tr.docChanged || old.map.size === 0) return old
          return { map: old.map, deco: old.deco.map(tr.mapping, tr.doc) }
        },
      },
      props: {
        decorations(state) {
          return key.getState(state)?.deco ?? DecorationSet.empty
        },
        // The blank end of a sheet: a tap there puts the caret at the end of
        // the last block on that sheet (or makes an empty line).
        handleClick(view, _pos, event) {
          const el = event.target as HTMLElement | null
          const outer = el?.closest?.('.ln-pushed')
          if (!outer || !view.dom.contains(outer)) return false
          if (event.clientY >= outer.getBoundingClientRect().top) return false
          return caretInGap(view, outer as HTMLElement)
        },
      },
      view: (view) => {
        views.set(view.dom as HTMLElement, view)
        return { destroy: () => views.delete(view.dom as HTMLElement) }
      },
    }),
  ],
})

/**
 * Tap in the blank space above a pushed block: the caret goes to the end of
 * the block before it; if that one has no text (a picture), an empty line is
 * made after it.
 */
export function caretInGap(view: EditorView, pushed: HTMLElement): boolean {
  const id =
    pushed.getAttribute('data-id') ??
    pushed.querySelector('[data-id]')?.getAttribute('data-id')
  const group = view.state.doc.firstChild
  if (!id || !group) return false
  let prev: { node: PMNode; pos: number } | null = null
  let hit = false
  group.forEach((node, offset) => {
    if (hit) return
    if (node.attrs.id === id) hit = true
    else prev = { node, pos: offset + 1 }
  })
  const before = prev as { node: PMNode; pos: number } | null
  if (!hit || !before) return false
  const { node, pos } = before
  const after = pos + node.nodeSize
  const text = node.firstChild
  if (text?.isTextblock) {
    const end = pos + 1 + text.nodeSize - 1
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, end)),
    )
  } else {
    const fresh = view.state.schema.nodes.blockContainer.createAndFill()
    if (!fresh) return false
    const tr = view.state.tr.insert(after, fresh)
    tr.setSelection(TextSelection.near(tr.doc.resolve(after + 2)))
    view.dispatch(tr)
  }
  view.focus()
  return true
}

/** A spacer inside a tall block: `px` of free space before the text at `pos`. */
interface Spacer {
  pos: number
  px: number
}
const spacerKey = new PluginKey<Spacer[]>('ln-pagination-spacers')

/** Splits tall blocks for display: widgets that push the lines after them down. */
export const paginationSpacers = createExtension({
  key: 'learning-notes-pagination-spacers',
  prosemirrorPlugins: [
    new Plugin<Spacer[]>({
      key: spacerKey,
      state: {
        init: () => [],
        apply: (tr, old) =>
          tr.getMeta(spacerKey) ??
          (tr.docChanged
            ? old.map((s) => ({ ...s, pos: tr.mapping.map(s.pos) }))
            : old),
      },
      props: {
        decorations(state) {
          const list = spacerKey.getState(state) ?? []
          if (list.length === 0) return DecorationSet.empty
          return DecorationSet.create(
            state.doc,
            list
              .filter((s) => s.pos > 0 && s.pos < state.doc.content.size)
              .map((s) =>
                Decoration.widget(
                  s.pos,
                  () => {
                    const el = document.createElement('span')
                    el.setAttribute('data-page-spacer', '')
                    el.contentEditable = 'false'
                    el.style.cssText = `display:block;height:${s.px}px;pointer-events:none`
                    return el
                  },
                  { side: -1, key: 'sp' + s.px + '-' + s.pos },
                ),
              ),
          )
        },
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
  const had = key.getState(view.state)?.map ?? new Map<string, number>()
  const spacersHad = spacerKey.getState(view.state) ?? []
  const ids = outers.map(idOf)
  const room = sheet0.height - topMargin - bottomMargin
  // Natural positions: what is measured minus the pushes already applied
  // (block margins and spacers). A block taller than a sheet is measured line
  // by line, so a line can move on its own.
  interface Item {
    top: number
    height: number
    block: number
    /** Set for a line of a tall block: where its text starts. */
    pos?: number
    first?: boolean
  }
  const items: Item[] = []
  // Where each top-level block starts, from the document (one pass). The old
  // way asked the DOM for every block (posAtDOM walks the siblings each time:
  // slow on a page of thousands of blocks, on every keystroke).
  const starts = blockStarts(view, outers.length)
  let margins = 0
  const spacerPx = (from: number, to: number) =>
    spacersHad
      .filter((x) => x.pos >= from && x.pos < to)
      .reduce((n, x) => n + x.px, 0) * scale
  outers.forEach((el, i) => {
    margins += (had.get(ids[i]) ?? 0) * scale
    const r = el.getBoundingClientRect()
    const start = starts ? starts[i] : posOf(view, el)
    const nextEl = el.nextElementSibling as HTMLElement | null
    const end = starts
      ? i + 1 < starts.length
        ? starts[i + 1]
        : view.state.doc.content.size
      : nextEl
        ? (posOf(view, nextEl) ?? view.state.doc.content.size)
        : view.state.doc.content.size
    const before = start === null ? 0 : spacerPx(0, start)
    const inside = start === null || end === null ? 0 : spacerPx(start, end)
    const naturalH = r.height - inside
    if (naturalH > room && start !== null) {
      const lines = linesOf(view, el)
      if (lines.length > 1) {
        lines.forEach((l, j) =>
          items.push({
            top: l.top - margins - spacerPx(0, l.pos + 1),
            height: l.height,
            block: i,
            pos: l.pos,
            first: j === 0,
          }),
        )
        return
      }
    }
    items.push({ top: r.top - margins - before, height: naturalH, block: i })
  })
  const want = pushes(items, {
    top: sheet0.top,
    height: sheet0.height,
    gap: gapPx,
    bottomMargin,
    topMargin,
  })
  const next = new Map<string, number>()
  const spacers: Spacer[] = []
  items.forEach((it, j) => {
    const css = Math.round(want[j] / scale)
    if (css <= 0) return
    if (it.pos === undefined || it.first) next.set(ids[it.block], css)
    else spacers.push({ pos: it.pos, px: css })
  })
  let changed = spacers.length !== spacersHad.length
  if (!changed)
    changed = spacers.some(
      (x, j) =>
        x.pos !== spacersHad[j].pos || Math.abs(x.px - spacersHad[j].px) >= 1,
    )
  for (const id of ids) {
    if (Math.abs((next.get(id) ?? 0) - (had.get(id) ?? 0)) >= 1) changed = true
  }
  if (!changed) return false
  view.dispatch(
    view.state.tr
      .setMeta(key, next)
      .setMeta(spacerKey, spacers)
      .setMeta('addToHistory', false),
  )
  return true
}

/**
 * The document position where each top-level block starts (inside it, as
 * posAtDOM(outer, 0) says), read from the document, not the DOM. Null if the
 * document and the DOM disagree on the count (then the DOM way is used).
 */
function blockStarts(view: EditorView, count: number): number[] | null {
  const group = view.state.doc.firstChild
  if (!group || group.childCount !== count) return null
  const out: number[] = []
  group.forEach((_node, offset) => out.push(offset + 2))
  return out
}

const posOf = (view: EditorView, el: HTMLElement): number | null => {
  try {
    return view.posAtDOM(el, 0)
  } catch {
    return null
  }
}

/** The text lines of a block (client rects) with the document position each starts at. */
function linesOf(
  view: EditorView,
  outer: HTMLElement,
): (LineRect & { pos: number })[] {
  const content = outer.querySelector<HTMLElement>('.bn-inline-content')
  if (!content) return []
  const range = document.createRange()
  range.selectNodeContents(content)
  const lines = groupLines(
    Array.from(range.getClientRects()).map((r) => ({
      top: r.top,
      bottom: r.bottom,
      left: r.left,
    })),
  )
  const out: (LineRect & { pos: number })[] = []
  for (const l of lines) {
    const at = view.posAtCoords({ left: l.left + 1, top: l.top + l.height / 2 })
    if (at) out.push({ ...l, pos: at.pos })
  }
  return out
}

/** Takes every push away (the paper is not in sheets: fit width, the reader). */
export function clearPagination(editorEl: HTMLElement): void {
  const view = views.get(editorEl)
  if (!view) return
  if (
    (key.getState(view.state)?.map.size ?? 0) === 0 &&
    (spacerKey.getState(view.state)?.length ?? 0) === 0
  )
    return
  view.dispatch(
    view.state.tr
      .setMeta(key, new Map())
      .setMeta(spacerKey, [])
      .setMeta('addToHistory', false),
  )
}
