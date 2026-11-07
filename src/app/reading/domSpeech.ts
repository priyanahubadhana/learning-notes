import type { SpeechText } from './readAloud'

/**
 * Connects Read aloud to the page on screen: builds the text to speak from
 * the editor's text, and marks the word being spoken with the CSS Custom
 * Highlight API (nothing in the page is changed, so nothing can be saved by
 * accident). Where the API is missing the page just scrolls to the sentence.
 */

interface Seg {
  node: Text
  /** Offsets of this text node's first character in the whole text. */
  start: number
}

const WORD_HIGHLIGHT = 'reading-word'
const SENTENCE_HIGHLIGHT = 'reading-sentence'

export interface TextMap extends SpeechText {
  /** Offset in the text of a point on screen (or of a node), -1 if none. */
  offsetAtPoint: (x: number, y: number) => number
  offsetOfNode: (node: Node, offset: number) => number
  /** Id of the block holding an offset. */
  blockIdAt: (offset: number) => string | null
  /** First offset of a block. */
  offsetOfBlock: (blockId: string) => number
}

/** Hidden-blank words are spoken as "blank" in self-test mode. */
const BLANK_WORD = '…'

export function buildTextMap(
  root: HTMLElement,
  options: { hideBlanks: boolean },
): TextMap {
  const segs: Seg[] = []
  const blockStarts = new Map<string, number>()
  let text = ''
  let lastBlock: Element | null = null
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text
    const parent = node.parentElement
    if (!parent?.closest('.bn-inline-content')) continue
    if (parent.closest('[aria-hidden="true"]')) continue
    const block = parent.closest('.bn-block-content')
    if (block !== lastBlock) {
      if (text !== '' && !text.endsWith('\n')) text += '\n'
      lastBlock = block
      const id = block?.closest('[data-id]')?.getAttribute('data-id')
      if (id && !blockStarts.has(id)) blockStarts.set(id, text.length)
    }
    const hidden = options.hideBlanks && parent.closest('.recall-blank')
    segs.push({ node, start: text.length })
    // A hidden blank keeps its length in the map but is spoken as a dot.
    text += hidden ? BLANK_WORD.padEnd(node.data.length, BLANK_WORD) : node.data
  }

  const find = (offset: number): Seg | undefined => {
    for (let i = segs.length - 1; i >= 0; i--) {
      if (segs[i].start <= offset) return segs[i]
    }
    return segs[0]
  }

  const rangeFor = (start: number, end: number): Range | null => {
    const a = find(start)
    const b = find(Math.max(start, end - 1))
    if (!a || !b) return null
    const range = document.createRange()
    try {
      range.setStart(a.node, Math.min(a.node.length, start - a.start))
      range.setEnd(b.node, Math.min(b.node.length, end - b.start))
    } catch {
      return null
    }
    return range
  }

  const supportsHighlight =
    typeof CSS !== 'undefined' &&
    'highlights' in CSS &&
    typeof Highlight !== 'undefined'

  const mark = (name: string, start: number, end: number) => {
    const range = rangeFor(start, end)
    if (!range) return
    if (supportsHighlight) {
      CSS.highlights.set(name, new Highlight(range))
    }
    // Keep the spoken place in view.
    const rect = range.getBoundingClientRect()
    const scroller = scrollParent(root)
    if (rect.height > 0) {
      const box = scroller
        ? scroller.getBoundingClientRect()
        : { top: 0, bottom: window.innerHeight }
      if (rect.top < box.top + 60 || rect.bottom > box.bottom - 80) {
        const target =
          (scroller?.scrollTop ?? window.scrollY) + rect.top - box.top - 120
        if (scroller) scroller.scrollTo({ top: target })
        else window.scrollTo({ top: target })
      }
    }
  }

  return {
    text,
    markWord: (s, e) => {
      CSS.highlights?.delete(SENTENCE_HIGHLIGHT)
      mark(WORD_HIGHLIGHT, s, e)
    },
    markSentence: (s, e) => {
      CSS.highlights?.delete(WORD_HIGHLIGHT)
      mark(SENTENCE_HIGHLIGHT, s, e)
    },
    clearMarks: () => {
      if (supportsHighlight) {
        CSS.highlights.delete(WORD_HIGHLIGHT)
        CSS.highlights.delete(SENTENCE_HIGHLIGHT)
      }
    },
    offsetOfNode: (node, offset) => {
      const seg = segs.find((s) => s.node === node)
      return seg ? seg.start + offset : -1
    },
    offsetAtPoint: (x, y) => {
      let node: Node | null = null
      let offset = 0
      const doc = document as Document & {
        caretPositionFromPoint?: (
          x: number,
          y: number,
        ) => { offsetNode: Node; offset: number } | null
      }
      if (doc.caretPositionFromPoint) {
        const pos = doc.caretPositionFromPoint(x, y)
        if (pos) {
          node = pos.offsetNode
          offset = pos.offset
        }
      } else if (document.caretRangeFromPoint) {
        const r = document.caretRangeFromPoint(x, y)
        if (r) {
          node = r.startContainer
          offset = r.startOffset
        }
      }
      if (!node) return -1
      const seg = segs.find((s) => s.node === node)
      return seg ? seg.start + offset : -1
    },
    blockIdAt: (offset) => {
      let found: string | null = null
      let best = -1
      for (const [id, start] of blockStarts) {
        if (start <= offset && start > best) {
          best = start
          found = id
        }
      }
      return found
    },
    offsetOfBlock: (blockId) => blockStarts.get(blockId) ?? -1,
  }
}

/** The nearest ancestor that scrolls (or null for the page itself). */
export function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) {
      return p
    }
  }
  return null
}
