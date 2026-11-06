import { TextSelection } from 'prosemirror-state'
import { HIGHLIGHT_COLOURS } from '../app/tools/main/inkSettings'
import { distToPath } from './eraser'
import type { Pt } from './geometry'

/**
 * Highlighter "snap to text lines": a highlighter stroke that lies over
 * words becomes a real text highlight (a mark on those words), so it moves
 * and copies with the text. And the Highlight eraser takes such marks off
 * the words it rubs. Letters are found by measuring each one on screen.
 */

export interface TextRun {
  node: Text
  start: number
  end: number
}

interface EditorLike {
  prosemirrorView?: {
    posAtDOM: (node: Node, offset: number) => number
    state: { schema: { marks: Record<string, unknown> } }
  }
  transact: <T>(fn: (tr: never) => T) => T
  addStyles: (styles: object) => void
}

/** BlockNote's name of the highlight colour nearest to a colour. */
export function nearestHighlightName(hex: string): string {
  const names: Record<string, string> = {
    yellow: 'yellow',
    green: 'green',
    blue: 'blue',
    pink: 'pink',
    orange: 'orange',
    purple: 'purple',
  }
  const rgb = (h: string) =>
    [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const a = rgb(hex)
  let best = 'yellow'
  let bestD = Infinity
  for (const c of HIGHLIGHT_COLOURS) {
    const b = rgb(c.hex)
    const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
    if (d < bestD) {
      bestD = d
      best = names[c.id]
    }
  }
  return best
}

/**
 * The runs of letters whose middle lies within `reach` px of the path.
 * `box` is the ink container's screen box, so the path (in container px)
 * can be compared with letters (in screen px).
 */
export function textRunsUnder(
  root: HTMLElement,
  box: { left: number; top: number },
  path: readonly Pt[],
  reach: number,
  /** Also take the spaces that stand alone between words (the eraser). */
  gaps = false,
): TextRun[] {
  if (path.length === 0) return []
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of path) {
    x0 = Math.min(x0, p.x)
    y0 = Math.min(y0, p.y)
    x1 = Math.max(x1, p.x)
    y1 = Math.max(y1, p.y)
  }
  const pad = reach + 20
  const runs: TextRun[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text
    const text = node.data
    if (text.length === 0) continue
    range.selectNodeContents(node)
    const r = range.getBoundingClientRect()
    const rx = r.left - box.left
    const ry = r.top - box.top
    if (rx > x1 + pad || rx + r.width < x0 - pad) continue
    if (ry > y1 + pad || ry + r.height < y0 - pad) continue
    let start = -1
    for (let i = 0; i <= text.length; i++) {
      let hit = false
      if (i < text.length) {
        range.setStart(node, i)
        range.setEnd(node, i + 1)
        const cr = range.getClientRects()[0]
        if (cr && cr.width > 0) {
          const c = {
            x: cr.left - box.left + cr.width / 2,
            y: cr.top - box.top + cr.height / 2,
          }
          hit = distToPath(c, path) <= reach + cr.height / 4
        }
      }
      if (hit && start < 0) start = i
      if (!hit && start >= 0) {
        let s = start
        let e = i
        while (s < e && /\s/.test(text[s])) s++
        while (e > s && /\s/.test(text[e - 1])) e--
        if (e > s) runs.push({ node, start: s, end: e })
        else if (gaps && start === 0 && i === text.length && text.length > 0)
          runs.push({ node, start: 0, end: text.length })
        start = -1
      }
    }
  }
  return runs
}

/** The words in the runs, in reading order, for "Save to notes". */
export const runsText = (runs: readonly TextRun[]): string =>
  runs.map((r) => r.node.data.slice(r.start, r.end)).join(' ')

/** Puts a highlight colour on the runs. Returns false if the editor is not ready. */
export function highlightRuns(
  editor: EditorLike,
  runs: readonly TextRun[],
  colourName: string,
): boolean {
  const view = editor.prosemirrorView
  if (!view || runs.length === 0) return false
  let last = 0
  for (const run of runs) {
    const from = view.posAtDOM(run.node, run.start)
    const to = view.posAtDOM(run.node, run.end)
    if (from >= to) continue
    editor.transact((tr: never) => {
      const t = tr as unknown as {
        doc: never
        setSelection: (s: unknown) => void
      }
      t.setSelection(TextSelection.create(t.doc, from, to))
    })
    editor.addStyles({ backgroundColor: colourName })
    last = to
  }
  if (last > 0) {
    editor.transact((tr: never) => {
      const t = tr as unknown as {
        doc: never
        setSelection: (s: unknown) => void
      }
      t.setSelection(TextSelection.create(t.doc, last))
    })
  }
  return last > 0
}

/** Takes any highlight off the runs (the Highlight eraser). */
export function clearHighlightRuns(
  editor: EditorLike,
  runs: readonly TextRun[],
): boolean {
  const view = editor.prosemirrorView
  const mark = view?.state.schema.marks.backgroundColor
  if (!view || !mark || runs.length === 0) return false
  const spans = runs
    .map((r) => [view.posAtDOM(r.node, r.start), view.posAtDOM(r.node, r.end)])
    .filter(([a, b]) => a < b)
  if (spans.length === 0) return false
  editor.transact((tr: never) => {
    const t = tr as unknown as {
      removeMark: (from: number, to: number, mark: unknown) => void
    }
    for (const [from, to] of spans) t.removeMark(from, to, mark)
  })
  return true
}

/** A highlight taken off the words for the live preview (put back at the end). */
export interface LiveRemoved {
  from: number
  to: number
  mark: unknown
}

interface LiveView {
  posAtDOM: (node: Node, offset: number) => number
  state: {
    doc: {
      nodesBetween: (
        from: number,
        to: number,
        f: (
          node: {
            isText: boolean
            nodeSize: number
            marks: { type: unknown }[]
          },
          pos: number,
        ) => void,
      ) => void
    }
    schema: { marks: Record<string, unknown> }
  }
}

/**
 * The Highlight eraser, live: takes the highlight off the runs at once, with
 * no Undo step, and returns what it took so the end of the stroke can put it
 * back and make the one real (undoable) edit. The text does not change, so
 * the positions stay true.
 */
export function eraseHighlightsLive(
  editor: EditorLike,
  runs: readonly TextRun[],
): LiveRemoved[] {
  const view = editor.prosemirrorView as unknown as LiveView | undefined
  const markType = view?.state.schema.marks.backgroundColor
  if (!view || !markType || runs.length === 0) return []
  const removed: LiveRemoved[] = []
  for (const r of runs) {
    const from = view.posAtDOM(r.node, r.start)
    const to = view.posAtDOM(r.node, r.end)
    if (from >= to) continue
    view.state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isText) return
      const mark = node.marks.find((m) => m.type === markType)
      if (mark)
        removed.push({
          from: Math.max(pos, from),
          to: Math.min(pos + node.nodeSize, to),
          mark,
        })
    })
  }
  if (removed.length === 0) return []
  editor.transact((tr: never) => {
    const t = tr as unknown as {
      removeMark: (from: number, to: number, mark: unknown) => void
      setMeta: (key: string, value: unknown) => void
    }
    for (const r of removed) t.removeMark(r.from, r.to, markType)
    t.setMeta('addToHistory', false)
  })
  return removed
}

/** Puts back what `eraseHighlightsLive` took (no Undo step). */
export function restoreHighlights(
  editor: EditorLike,
  removed: readonly LiveRemoved[],
): void {
  if (removed.length === 0) return
  editor.transact((tr: never) => {
    const t = tr as unknown as {
      addMark: (from: number, to: number, mark: unknown) => void
      setMeta: (key: string, value: unknown) => void
    }
    for (const r of removed) t.addMark(r.from, r.to, r.mark)
    t.setMeta('addToHistory', false)
  })
}
