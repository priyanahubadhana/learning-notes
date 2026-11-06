/**
 * Liquid mode (C5, beta): the text of a PDF page regrouped into paragraphs
 * and headings so it reflows to any screen. Works from pdf.js
 * `getTextContent()` items: lines are found by their y position, paragraphs
 * by the gap between lines, headings by a bigger font. A scanned PDF has no
 * text, so it gives nothing.
 */

/** The parts of a pdf.js text item that grouping needs. */
export interface TextPiece {
  str: string
  /** [a, b, c, d, e, f]: e = x, f = y (PDF space, y grows upwards). */
  transform: number[]
  height: number
}

export interface LiquidBlock {
  kind: 'heading' | 'paragraph'
  text: string
}

interface Line {
  y: number
  x: number
  size: number
  text: string
}

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

/** Items to lines: pieces whose y is within half a line height belong together. */
function toLines(items: readonly TextPiece[]): Line[] {
  const pieces = items
    .filter((i) => i.str.trim() !== '' && i.transform.length >= 6)
    .map((i) => ({
      str: i.str,
      x: i.transform[4],
      y: i.transform[5],
      size: Math.abs(i.height) || Math.abs(i.transform[3]) || 10,
    }))
  const lines: { y: number; size: number; parts: { x: number; str: string }[] }[] = []
  for (const p of pieces) {
    const line = lines.find((l) => Math.abs(l.y - p.y) < Math.max(l.size, p.size) * 0.5)
    if (line) {
      line.parts.push({ x: p.x, str: p.str })
      line.size = Math.max(line.size, p.size)
    } else {
      lines.push({ y: p.y, size: p.size, parts: [{ x: p.x, str: p.str }] })
    }
  }
  // Top of the page first.
  lines.sort((a, b) => b.y - a.y)
  return lines.map((l) => {
    const parts = l.parts.sort((a, b) => a.x - b.x)
    return {
      y: l.y,
      x: parts[0].x,
      size: l.size,
      text: parts
        .map((p) => p.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    }
  })
}

/** Joins a line onto a paragraph: a word cut by a hyphen is made whole again. */
const join = (text: string, next: string): string =>
  /[A-Za-z]-$/.test(text) && /^[a-z]/.test(next)
    ? text.slice(0, -1) + next
    : `${text} ${next}`

/** One page's pieces to headings and paragraphs, in reading order. */
export function liquidBlocks(items: readonly TextPiece[]): LiquidBlock[] {
  const lines = toLines(items)
  if (lines.length === 0) return []
  const body = median(lines.map((l) => l.size))
  const gaps = lines.slice(1).map((l, i) => lines[i].y - l.y)
  const normalGap = median(gaps.filter((g) => g > 0)) || body * 1.2
  const out: LiquidBlock[] = []
  let current: LiquidBlock | null = null
  let prev: Line | null = null
  for (const line of lines) {
    const heading = line.size > body * 1.2 && line.text.length < 120
    const gap = prev ? prev.y - line.y : 0
    const startsNew =
      !current ||
      heading !== (current.kind === 'heading') ||
      gap > normalGap * 1.45 ||
      // A line that is indented a good way in starts a paragraph.
      (prev !== null && line.x - prev.x > body * 1.2 && !heading)
    if (startsNew || !current) {
      current = { kind: heading ? 'heading' : 'paragraph', text: line.text }
      out.push(current)
    } else {
      current.text = join(current.text, line.text)
    }
    prev = line
  }
  return out
}
