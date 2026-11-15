import './eraseText.css'
import { distToPath } from './eraser'
import type { Pt } from './geometry'
import { restoreHighlights, type LiveRemoved } from './textSnap'

/**
 * The eraser's work on the words of the page (tool bar v9, 2A.8, T10): text
 * highlights ("Highlighter") and typed text ("Text").
 *
 * Why it is built this way (T10: the eraser lagged with highlights only and
 * left gaps inside words): the old code measured every letter of the page on
 * every pointer move, and measured again after each repaint of the words it
 * had just changed. Here the letters on screen are measured ONCE when the
 * stroke starts (with their document positions), each move only compares
 * numbers, and the page is changed once per frame. Spaces between words and
 * letters the browser cannot measure go with their neighbours, so no gap and
 * no thin mark is left.
 */

export interface Span {
  from: number
  to: number
}

export interface Letter {
  /** Document position of the letter. */
  pos: number
  /** Middle of the letter, in the ink container's px. */
  x: number
  y: number
  h: number
  /** The browser could not measure it: it goes with its neighbours. */
  blind: boolean
  /** The word it belongs to (whole words go together); -1 for a space. */
  word: number
}

interface View {
  posAtDOM: (node: Node, offset: number) => number
  domAtPos?: (pos: number) => { node: Node; offset: number }
  state: {
    schema: { marks: Record<string, unknown> }
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
  }
}

export interface EraseEditor {
  prosemirrorView?: unknown
  transact: <T>(fn: (tr: never) => T) => T
}

interface Tr {
  removeMark: (from: number, to: number, mark: unknown) => void
  delete: (from: number, to: number) => void
  setMeta: (key: string, value: unknown) => void
}

const WS = /\s/
const MARK_SELECTOR = '[data-style-type="backgroundColor"]'

/**
 * The letters of the words on screen, measured once. `markedOnly` measures
 * only highlighted words (highlights only: a small set, so it starts fast).
 */
export function indexLetters(
  root: HTMLElement,
  box: { left: number; top: number },
  view: Pick<View, 'posAtDOM'>,
  markedOnly: boolean,
): Letter[] {
  const out: Letter[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  const screenH = window.innerHeight || 4000
  let word = 0
  let block: Element | null = null
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text
    const text = node.data
    if (text.length === 0) continue
    if (markedOnly && !node.parentElement?.closest(MARK_SELECTOR)) continue
    range.selectNodeContents(node)
    const nr = range.getBoundingClientRect()
    // Off screen: the page cannot scroll under a rubbing eraser.
    if (nr.bottom < -40 || nr.top > screenH + 40) continue
    const base = view.posAtDOM(node, 0)
    // A word goes on across a mark boundary, but never across blocks.
    const here = node.parentElement?.closest('.bn-block-content') ?? null
    if (here !== block) {
      word++
      block = here
    }
    const first = out.length
    let lastGood = -1
    for (let i = 0; i < text.length; i++) {
      const space = WS.test(text[i]!)
      if (space) word++
      const w = space ? -1 : word
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const cr = range.getClientRects()[0]
      if (cr && cr.width > 0) {
        out.push({
          pos: base + i,
          x: cr.left - box.left + cr.width / 2,
          y: cr.top - box.top + cr.height / 2,
          h: cr.height,
          blind: false,
          word: w,
        })
        lastGood = out.length - 1
      } else {
        // Borrow the nearest measured neighbour (a space at a line's end).
        const near = lastGood >= first ? out[lastGood] : undefined
        out.push({
          pos: base + i,
          x: near ? near.x : nr.left - box.left,
          y: near ? near.y : nr.top - box.top + nr.height / 2,
          h: near ? near.h : nr.height,
          blind: true,
          word: w,
        })
      }
    }
  }
  return out
}

/** Merges touching spans (positions only). */
export function mergeSpans(spans: readonly Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.from - b.from)
  const out: Span[] = []
  for (const s of sorted) {
    const last = out[out.length - 1]
    if (last && s.from <= last.to) last.to = Math.max(last.to, s.to)
    else out.push({ ...s })
  }
  return out
}

/** The letters not taken yet whose middle lies within `reach` of the path, as spans. */
export function spansUnder(
  letters: readonly Letter[],
  taken: Set<number>,
  path: readonly Pt[],
  reach: number,
): Span[] {
  const hits: Span[] = []
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
  const fresh: number[] = []
  const hitWords = new Set<number>()
  for (let i = 0; i < letters.length; i++) {
    if (taken.has(i)) continue
    const l = letters[i]!
    const r = reach + l.h / 4
    let hit = false
    if (l.x >= x0 - r && l.x <= x1 + r && l.y >= y0 - r && l.y <= y1 + r)
      hit = distToPath({ x: l.x, y: l.y }, path) <= r
    if (hit) {
      fresh.push(i)
      if (l.word >= 0) hitWords.add(l.word)
    }
  }
  // Whole words: one letter touched takes its word (no cut letters at the
  // ends); the space between two taken words, and a space the Pencil touched,
  // go too (no thin mark between words). A letter the browser could not
  // measure goes with the letter before it.
  const take = (i: number) => {
    if (taken.has(i)) return
    taken.add(i)
    hits.push({ from: letters[i]!.pos, to: letters[i]!.pos + 1 })
  }
  for (const i of fresh) take(i)
  if (hitWords.size > 0)
    letters.forEach((l, i) => {
      if (l.word >= 0 && hitWords.has(l.word)) take(i)
    })
  for (let i = 1; i < letters.length - 1; i++) {
    const l = letters[i]!
    if (taken.has(i)) continue
    if (
      (l.word < 0 || l.blind) &&
      taken.has(i - 1) &&
      (l.blind || taken.has(i + 1))
    )
      take(i)
  }
  return mergeSpans(hits)
}

const hasHighlight = (view: View, from: number, to: number): boolean => {
  const markType = view.state.schema.marks.backgroundColor
  let found = false
  view.state.doc.nodesBetween(from, to, (node) => {
    if (node.isText && node.marks.some((m) => m.type === markType)) found = true
  })
  return found
}

interface HighlightApi {
  CSS?: { highlights?: Map<string, unknown> }
  Highlight?: new (...ranges: Range[]) => unknown
}
const DIM = 'ink-erasing'

/**
 * One erase stroke over the words. `move` collects what the Pencil touched;
 * the page changes once per frame (highlights vanish live, typed text is
 * dimmed); `finish` makes the one real edit: one Undo step.
 */
export class WordEraseSession {
  private letters: Letter[] | null = null
  private readonly taken = new Set<number>()
  private pendingHl: Span[] = []
  private readonly textSpans: Span[] = []
  private readonly hlSpans: Span[] = []
  private live: LiveRemoved[] = []
  private frame = 0

  private readonly editor: EraseEditor
  private readonly root: HTMLElement
  private readonly box: { left: number; top: number }
  private readonly want: { hl: boolean; text: boolean }

  constructor(
    editor: EraseEditor,
    root: HTMLElement,
    box: { left: number; top: number },
    want: { hl: boolean; text: boolean },
  ) {
    this.editor = editor
    this.root = root
    this.box = box
    this.want = want
  }

  private get view(): View | undefined {
    return this.editor.prosemirrorView as View | undefined
  }

  /** The Pencil moved from `from` to `to` (container px). */
  move(from: Pt, to: Pt, reach: number): void {
    const view = this.view
    if (!view || (!this.want.hl && !this.want.text)) return
    if (!this.letters)
      this.letters = indexLetters(this.root, this.box, view, !this.want.text)
    const spans = spansUnder(this.letters, this.taken, [from, to], reach)
    if (spans.length === 0) return
    if (this.want.hl) {
      this.hlSpans.push(...spans)
      this.pendingHl.push(...spans)
    }
    if (this.want.text) this.textSpans.push(...spans)
    if (!this.frame) {
      this.frame = requestAnimationFrame(() => {
        this.frame = 0
        this.flush()
      })
    }
  }

  /** Applies what was collected since the last frame (live, no Undo step). */
  flush(): void {
    if (this.frame) {
      cancelAnimationFrame(this.frame)
      this.frame = 0
    }
    const view = this.view
    if (!view) return
    const markType = view.state.schema.marks.backgroundColor
    if (this.pendingHl.length > 0 && markType) {
      const removed: LiveRemoved[] = []
      for (const s of mergeSpans(this.pendingHl)) {
        view.state.doc.nodesBetween(s.from, s.to, (node, pos) => {
          if (!node.isText) return
          const mark = node.marks.find((m) => m.type === markType)
          if (mark)
            removed.push({
              from: Math.max(pos, s.from),
              to: Math.min(pos + node.nodeSize, s.to),
              mark,
            })
        })
      }
      this.pendingHl = []
      if (removed.length > 0) {
        this.editor.transact((tr: never) => {
          const t = tr as unknown as Tr
          for (const r of removed) t.removeMark(r.from, r.to, markType)
          t.setMeta('addToHistory', false)
        })
        this.live.push(...removed)
      }
    }
    this.dim()
  }

  /** Typed words that will go are shown faint while the Pencil rubs. */
  private dim(): void {
    const view = this.view
    const api = globalThis as unknown as HighlightApi
    if (!view?.domAtPos || !api.CSS?.highlights || !api.Highlight) return
    if (this.textSpans.length === 0) return
    const ranges: Range[] = []
    for (const s of mergeSpans(this.textSpans)) {
      try {
        const a = view.domAtPos(s.from)
        const b = view.domAtPos(s.to)
        const r = document.createRange()
        r.setStart(a.node, a.offset)
        r.setEnd(b.node, b.offset)
        ranges.push(r)
      } catch {
        // A position the page no longer has: it is simply not dimmed.
      }
    }
    api.CSS.highlights.set(DIM, new api.Highlight(...ranges))
  }

  private undim(): void {
    const api = globalThis as unknown as HighlightApi
    api.CSS?.highlights?.delete(DIM)
  }

  /** The stroke ended: put the live changes back and make the one real edit. */
  finish(): void {
    this.flush()
    this.undim()
    const view = this.view
    if (!view) return
    restoreHighlights(this.editor as never, this.live)
    this.live = []
    const markType = view.state.schema.marks.backgroundColor
    const hl = mergeSpans(this.hlSpans).filter(
      (s) => !!markType && hasHighlight(view, s.from, s.to),
    )
    const text = mergeSpans(this.textSpans)
    if (hl.length === 0 && text.length === 0) return
    this.editor.transact((tr: never) => {
      const t = tr as unknown as Tr
      for (const s of hl) t.removeMark(s.from, s.to, markType)
      // From the end of the page, so earlier positions stay true.
      for (const s of [...text].reverse()) t.delete(s.from, s.to)
    })
  }
}
