import type { BookSource } from './bookAloud'

const BLOCKS = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, div, td'

interface Seg {
  node: Text
  start: number
}

/**
 * Text of a book page or chapter for Read aloud: the text nodes under
 * `root` in order, with the word or sentence now spoken marked through the
 * CSS Custom Highlight API of the window that owns the text (an EPUB's frame
 * or the app). `visible` is the on-screen box in that window's coordinates;
 * the first text inside it is where reading starts.
 */
export function bookSource(
  root: HTMLElement,
  visible: () => { left: number; top: number; right: number; bottom: number },
): BookSource {
  const doc = root.ownerDocument
  const win = (doc.defaultView ?? window) as Window & typeof globalThis
  const segs: Seg[] = []
  let text = ''
  let lastBlock: Element | null = null
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text
    const parent = node.parentElement
    if (!parent || parent.closest('script, style, [aria-hidden="true"]')) {
      continue
    }
    if (!node.data.trim()) continue
    const block = parent.closest(BLOCKS)
    // A new paragraph starts a new line so sentences do not run together.
    if (text && !/\s$/.test(text)) text += block !== lastBlock ? '\n' : ' '
    lastBlock = block
    segs.push({ node, start: text.length })
    text += node.data
  }
  const find = (offset: number) => {
    for (let i = segs.length - 1; i >= 0; i--) {
      if (segs[i].start <= offset) return segs[i]
    }
    return segs[0]
  }
  const rangeFor = (start: number, end: number): Range | null => {
    const a = find(start)
    const b = find(Math.max(start, end - 1))
    if (!a || !b) return null
    const range = doc.createRange()
    try {
      range.setStart(a.node, Math.min(a.node.length, start - a.start))
      range.setEnd(b.node, Math.min(b.node.length, end - b.start))
    } catch {
      return null
    }
    return range
  }
  const canMark =
    'highlights' in win.CSS && typeof win.Highlight !== 'undefined'
  const mark = (name: string, other: string, start: number, end: number) => {
    const range = rangeFor(start, end)
    if (!range) return
    if (canMark) {
      win.CSS.highlights.delete(other)
      win.CSS.highlights.set(name, new win.Highlight(range))
    }
    // Keep the spoken place on screen (the reader's frame follows).
    const r = range.getBoundingClientRect()
    const v = visible()
    if (
      r.height > 0 &&
      (r.bottom > v.bottom - 40 ||
        r.top < v.top + 20 ||
        r.right > v.right ||
        r.left < v.left)
    ) {
      range.startContainer.parentElement?.scrollIntoView({
        block: 'center',
        inline: 'center',
      })
    }
  }
  return {
    text,
    markWord: (s, e) => mark('reading-word', 'reading-sentence', s, e),
    markSentence: (s, e) => mark('reading-sentence', 'reading-word', s, e),
    clearMarks: () => {
      if (canMark) {
        win.CSS.highlights.delete('reading-word')
        win.CSS.highlights.delete('reading-sentence')
      }
    },
    firstVisible: () => {
      const v = visible()
      for (const s of segs) {
        const r = s.node.parentElement?.getBoundingClientRect()
        if (
          r &&
          r.width > 0 &&
          r.bottom > v.top &&
          r.top < v.bottom &&
          r.right > v.left &&
          r.left < v.right
        ) {
          return s.start
        }
      }
      return 0
    },
  }
}
