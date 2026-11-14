import { RESIZE_HANDLES, type ResizeHow } from '../boxHandles'

/**
 * Text box v2 (task 2B.5), loaded only with the switch ON: where a press
 * near a box edge goes (TB-20) and how small a box may get (TB-21).
 */

/** A handle target is 44 pt square (spec "Sizes"). */
export const ZONE = 44
/** A press must be held this long before the resize commits (spec "Sizes"). */
export const HOLD_MS = 120
/** A move under this many px is a tap, not a resize. */
export const DEAD_PX = 4

type Span = [number, number]
/** The part of one axis a handle covers: the near side, the far side or the middle. */
const span = (minus: boolean, plus: boolean, len: number): Span =>
  minus
    ? [-ZONE, 0]
    : plus
      ? [len, len + ZONE]
      : [len / 2 - ZONE / 2, len / 2 + ZONE / 2]

/** A handle's target, in px from the box's top left: always outside the box on its own side. */
export function zoneOf(how: ResizeHow, w: number, h: number) {
  const [x0, x1] = span(how.includes('w'), how.includes('e'), w)
  const [y0, y1] = span(how.includes('n'), how.includes('s'), h)
  return { x0, y0, x1, y1 }
}

/** Where the dot is drawn: on the edge, the middle of its side or the corner. */
const dotOf = (how: ResizeHow, w: number, h: number) => ({
  x: how.includes('w') ? 0 : how.includes('e') ? w : w / 2,
  y: how.includes('n') ? 0 : how.includes('s') ? h : h / 2,
})

/**
 * The handle a press at (x, y) belongs to (px from the box's top left):
 * among the targets that hold the point, the one whose dot is nearest. A point
 * inside the box belongs to the text (null). Zones may touch on a tiny box;
 * the point still has exactly one owner.
 */
export function nearestHandle(
  x: number,
  y: number,
  w: number,
  h: number,
): ResizeHow | null {
  let best: ResizeHow | null = null
  let bestD = Infinity
  for (const how of RESIZE_HANDLES) {
    const z = zoneOf(how, w, h)
    if (x < z.x0 || x > z.x1 || y < z.y0 || y > z.y1) continue
    const c = dotOf(how, w, h)
    const d = Math.hypot(x - c.x, y - c.y)
    if (
      d < bestD - 1e-9 ||
      (Math.abs(d - bestD) <= 1e-9 && how.length > (best?.length ?? 0))
    ) {
      best = how
      bestD = d
    }
  }
  return best
}

/** Width of the longest word of some texts, each measured in its own font. */
export function longestWordPx(
  parts: { text: string; font: string }[],
  measure: (text: string, font: string) => number,
): number {
  const words: { text: string; font: string }[] = []
  for (const p of parts)
    for (const m of p.text.matchAll(/\S+/g))
      words.push({ text: m[0], font: p.font })
  // The longest few by characters; a wide font may make a shorter one wider.
  words.sort((a, b) => b.text.length - a.text.length)
  let widest = 0
  for (const w of words.slice(0, 12))
    widest = Math.max(widest, measure(w.text, w.font))
  return widest
}

let canvas: CanvasRenderingContext2D | null | undefined
const measureDom = (text: string, font: string) => {
  if (canvas === undefined)
    canvas = document.createElement('canvas').getContext('2d')
  if (!canvas) return text.length * 8
  canvas.font = font
  return canvas.measureText(text).width
}

/**
 * The least width (screen px) a box may have: its longest word plus the frame
 * and padding around the text. `frame` is the box element, `content` its text area.
 */
export function minWidthPx(frame: HTMLElement, content: HTMLElement): number {
  const z = parseFloat(content.style.zoom || '1') || 1
  const parts: { text: string; font: string }[] = []
  const walk = document.createTreeWalker(content, NodeFilter.SHOW_TEXT)
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const el = n.parentElement
    if (!el || !n.textContent?.trim()) continue
    const cs = getComputedStyle(el)
    parts.push({
      text: n.textContent,
      font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
    })
  }
  const word = longestWordPx(parts, measureDom) * z
  const cs = getComputedStyle(content)
  const pad = (parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) * z
  const textArea = content.getBoundingClientRect().width - pad
  const chrome = frame.getBoundingClientRect().width - textArea
  return word + chrome
}
