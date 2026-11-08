import type { LearningNotesDB } from '../../core/db'
import { toBase64 } from '../../core/base64'
import { isLive } from '../../core/records'
import type { Stroke } from '../../core/inkTypes'
import type { Page, StoredImage } from '../../core/types'
import { loadInk } from '../../core/inkService'
import {
  BOX_COLOURS,
  boxesOf,
  groupBlocksByBox,
  MAIN_BOX,
  MARGIN,
  sheetOf,
} from '../../paper/boxes'
import { paperStepMm } from '../../paper/sheets'
import { nodesOf, type ExportNode } from './model'
import { nodesHtml, PRINT_CSS } from './printHtml'

/**
 * The page as paper (PDF / print "Paper layout"): sheets at their real size
 * with the page's background, each box at its place on them, and the ink in
 * place. Text stays text. `paperHtml` is pure (text in, text out); the
 * measuring and the ink picture need a browser (`buildPaperPrint`).
 */

const PX_PER_MM = 96 / 25.4

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export interface PaperBoxInput {
  id: string
  /** Position and width on the paper, in mm. */
  x: number
  y: number
  w: number
  colour?: string
  nodes: ExportNode[]
}

export interface PaperInput {
  title: string
  lang?: string
  /** Sheet size in mm. */
  sheet: { w: number; h: number }
  bg: Page['inkBg']
  boxes: PaperBoxInput[]
}

/** A box's ink as a picture the size of its content, in CSS px. */
export interface PaperInk {
  url: string
  w: number
  h: number
}

const round = (v: number) => Math.round(v * 100) / 100

/** How many sheets hold boxes of these heights (mm); at least one. */
export function sheetsFor(
  boxes: readonly Pick<PaperBoxInput, 'id' | 'y'>[],
  heights: Readonly<Record<string, number>>,
  sheetH: number,
): number {
  let bottom = 0
  for (const b of boxes) bottom = Math.max(bottom, b.y + (heights[b.id] ?? 0))
  return Math.max(1, Math.min(500, Math.ceil((bottom + MARGIN) / sheetH)))
}

function boxHtml(
  b: PaperBoxInput,
  top: number,
  imageUrl: (id: string) => string | undefined,
  ink: PaperInk | undefined,
): string {
  const tint = b.colour
    ? `background:color-mix(in srgb, ${BOX_COLOURS[b.colour] ?? b.colour} 14%, transparent);`
    : ''
  return (
    `<div class="bx" data-bx="${esc(b.id)}" style="left:${round(b.x)}mm;top:${round(top)}mm;width:${round(b.w)}mm;${tint}">` +
    `<div class="bc" data-bc="${esc(b.id)}">` +
    nodesHtml(b.nodes, imageUrl, 1, true) +
    (ink
      ? `<img class="inkimg" alt="" src="${esc(ink.url)}" style="width:${ink.w}px;height:${ink.h}px">`
      : '') +
    `</div></div>`
  )
}

/** The page's paper background as CSS for a sheet. */
function backgroundCss(bg: Page['inkBg'], stepMm: number, offsetMm: number) {
  const ink = 'rgba(60,60,67,'
  if (bg === 'lined')
    return `background-image:linear-gradient(to bottom,transparent calc(${stepMm}mm - 0.3mm),${ink}.28) 0);background-size:100% ${stepMm}mm;background-position:0 ${round(offsetMm)}mm;`
  if (bg === 'grid')
    return `background-image:linear-gradient(to right,${ink}.2) 0.25mm,transparent 0.25mm),linear-gradient(to bottom,${ink}.2) 0.25mm,transparent 0.25mm);background-size:${stepMm}mm ${stepMm}mm;background-position:0 ${round(offsetMm)}mm;`
  if (bg === 'dots')
    return `background-image:radial-gradient(circle,${ink}.45) 0.3mm,transparent 0.45mm);background-size:${stepMm}mm ${stepMm}mm;background-position:0 ${round(offsetMm)}mm;`
  return ''
}

/**
 * The printable paper. Without `heights` it is the measuring copy: every box
 * on one tall sheet. With the measured heights (mm) it is the final one:
 * each sheet a page of its own, holding the boxes that reach it (a box that
 * crosses a sheet's edge is cut there, as on the paper).
 */
export function paperHtml(
  input: PaperInput,
  options: {
    imageUrl?: (id: string) => string | undefined
    heights?: Readonly<Record<string, number>>
    ink?: ReadonlyMap<string, PaperInk>
  } = {},
): string {
  const imageUrl = options.imageUrl ?? (() => undefined)
  const { w, h } = input.sheet
  const stepMm = paperStepMm(input.bg)
  const main = input.boxes.find((b) => b.id === MAIN_BOX) ?? input.boxes[0]
  const bg = backgroundCss(input.bg, stepMm, main ? main.y % stepMm : 0)
  const lined = input.bg === 'lined'
  const css =
    `@page{size:${w}mm ${h}mm;margin:0}` +
    `html,body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
    `.sheet{position:relative;width:${w}mm;height:${h}mm;overflow:hidden;break-after:page;page-break-after:always;background-color:#fff;${bg}}` +
    `.sheet:last-child{break-after:auto;page-break-after:auto}` +
    `.sheet.measure{height:auto;min-height:${h}mm;overflow:visible}` +
    `.bx{position:absolute;box-sizing:border-box}.bc{position:relative;font-size:12pt;line-height:${lined ? stepMm + 'mm' : '1.5'}}` +
    `.bc p,.bc li{margin:0}.bc .inkimg{position:absolute;left:0;top:0;max-width:none;pointer-events:none}`
  const sheets: string[] = []
  if (!options.heights) {
    sheets.push(
      `<div class="sheet measure">${input.boxes.map((b) => boxHtml(b, b.y, imageUrl, undefined)).join('')}</div>`,
    )
  } else {
    const heights = options.heights
    const count = sheetsFor(input.boxes, heights, h)
    for (let i = 0; i < count; i++) {
      const top = i * h
      const here = input.boxes.filter(
        (b) => b.y < top + h && b.y + Math.max(1, heights[b.id] ?? 0) > top,
      )
      sheets.push(
        `<div class="sheet" data-sheet="${i + 1}">${here
          .map((b) => boxHtml(b, b.y - top, imageUrl, options.ink?.get(b.id)))
          .join('')}</div>`,
      )
    }
  }
  return (
    `<!doctype html><html lang="${esc(input.lang ?? 'en')}"><head><meta charset="utf-8">` +
    `<title>${esc(input.title)}</title><style>${PRINT_CSS}${css}</style></head><body>` +
    sheets.join('') +
    `</body></html>`
  )
}

/** Everything the paper layout needs from the database. */
export async function loadPaperInput(
  db: LearningNotesDB,
  pageId: string,
  lang?: string,
): Promise<{
  input: PaperInput
  images: Map<string, StoredImage>
  strokes: Map<string, PaperStroke[]>
}> {
  const page = await db.pages.get(pageId)
  if (!page || !isLive(page)) throw new Error('Page not found')
  const blocks = (
    await db.blocks.where('pageId').equals(pageId).toArray()
  ).filter(isLive)
  const groups = groupBlocksByBox(page, blocks)
  const boxes: PaperBoxInput[] = boxesOf(page).map((b) => ({
    id: b.id,
    x: b.x,
    y: b.y,
    w: b.w,
    colour: b.colour,
    nodes: nodesOf(groups.get(b.id) ?? []),
  }))
  // Pictures the boxes use.
  const ids = new Set<string>()
  const walk = (nodes: readonly ExportNode[]) => {
    for (const n of nodes) {
      if (n.imageId) ids.add(n.imageId)
      walk(n.children)
    }
  }
  for (const b of boxes) walk(b.nodes)
  const found = await db.images.bulkGet([...ids])
  const images = new Map(
    found
      .filter((i): i is StoredImage => !!i && isLive(i))
      .map((i) => [i.id, i]),
  )
  // Ink: each stroke goes with the box of the block it is anchored to.
  const boxOf = new Map<string, string>()
  for (const [boxId, list] of groups)
    for (const b of list) boxOf.set(b.id, boxId)
  const snap = await loadInk(db, pageId)
  const hidden = new Set(
    snap.layers
      .filter((l) => l.hidden || l.deletedAt !== null)
      .map((l) => l.id),
  )
  const strokes = new Map<string, PaperStroke[]>()
  for (const c of snap.chunks) {
    if (c.deletedAt !== null || c.purgedAt !== undefined) continue
    if (hidden.has(c.layerId) || c.strokes.length === 0) continue
    const box = (c.blockId && boxOf.get(c.blockId)) || MAIN_BOX
    const list = strokes.get(box) ?? []
    for (const stroke of c.strokes)
      list.push({ stroke, blockId: c.blockId, fb: c.fb })
    strokes.set(box, list)
  }
  for (const list of strokes.values())
    list.sort((a, b) => a.stroke.at - b.stroke.at)
  return {
    input: {
      title: page.title,
      lang,
      sheet: sheetOf(page),
      bg: page.inkBg,
      boxes,
    },
    images,
    strokes,
  }
}

export interface PaperStroke {
  stroke: Stroke
  blockId: string | null
  fb?: { x: number; y: number; w: number }
}

/** Stored pictures as data addresses the print frame can show. */
const imageUrls = (images: Map<string, StoredImage>) =>
  new Map(
    [...images.values()].map((i) => [
      i.id,
      `data:${i.type};base64,${toBase64(i.data)}`,
    ]),
  )

/** The most pixels one box's ink picture may have (iPad canvas memory). */
const MAX_INK_PIXELS = 8_000_000

/**
 * Lays the paper out off screen, ready to measure. It lives in a shadow root
 * (its styles cannot touch the app, and the app's cannot touch it) rather
 * than a frame: `body` rules become `:host` rules, so the text has the same
 * font and size as in the printed document.
 */
async function loadFrame(html: string, widthMm: number) {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const css = (parsed.head.querySelector('style')?.textContent ?? '')
    .replace(/html,body\{/g, ':host{')
    .replace(/(^|\})\s*body\s*\{/g, '$1:host{')
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:fixed;left:-99999px;top:0;width:${Math.ceil(widthMm * PX_PER_MM)}px;visibility:hidden;pointer-events:none`
  const root = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = `:host{display:block}` + css
  root.append(style)
  for (const node of [...parsed.body.childNodes])
    root.append(document.importNode(node, true))
  document.body.append(host)
  // Pictures and fonts, but never wait for ever on a browser that stays quiet.
  const settled = Promise.all([
    ...[...root.querySelectorAll('img')].map((i) =>
      i.decode().catch(() => undefined),
    ),
    document.fonts?.ready,
  ])
  await Promise.race([settled, new Promise((r) => setTimeout(r, 3000))])
  return { doc: root, close: () => host.remove() }
}

/**
 * Makes the printable paper for a page: measures every box as it will print,
 * draws its ink where its lines are, and writes the final sheets.
 */
export async function buildPaperPrint(
  db: LearningNotesDB,
  pageId: string,
  options: { lang?: string } = {},
): Promise<{ html: string; title: string }> {
  const { input, images, strokes } = await loadPaperInput(
    db,
    pageId,
    options.lang,
  )
  const urls = imageUrls(images)
  const imageUrl = (id: string) => urls.get(id)
  const frame = await loadFrame(paperHtml(input, { imageUrl }), input.sheet.w)
  const heights: Record<string, number> = {}
  const ink = new Map<string, PaperInk>()
  try {
    const { paintStroke, strokeRect } = await import('../../ink/render')
    for (const b of input.boxes) {
      const bc = frame.doc.querySelector<HTMLElement>(
        `[data-bc="${CSS.escape(b.id)}"]`,
      )
      if (!bc) continue
      const box = bc.getBoundingClientRect()
      heights[b.id] = round(box.height / PX_PER_MM)
      const list = strokes.get(b.id)
      if (!list) continue
      try {
        // Where each line is, from the top left of the box's content.
        const frameOf = (s: PaperStroke) => {
          const el = s.blockId
            ? bc.querySelector<HTMLElement>(
                `[data-b="${CSS.escape(s.blockId)}"]`,
              )
            : null
          if (el) {
            const r = el.getBoundingClientRect()
            return { x: r.left - box.left, y: r.top - box.top, w: box.width }
          }
          // A line that is gone keeps the place it was last seen.
          const k = s.fb && s.fb.w > 0 ? box.width / s.fb.w : 1
          return { x: (s.fb?.x ?? 0) * k, y: (s.fb?.y ?? 0) * k, w: box.width }
        }
        const placed = list.map((s) => ({ s, frame: frameOf(s) }))
        let bottom = box.height
        for (const p of placed) {
          const r = strokeRect(p.s.stroke, p.frame)
          if (r) bottom = Math.max(bottom, r.y + r.h)
        }
        const w = Math.max(1, Math.ceil(box.width))
        const h = Math.max(1, Math.ceil(bottom))
        const scale = Math.min(2, Math.sqrt(MAX_INK_PIXELS / (w * h)))
        if (scale < 0.25) continue
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(w * scale)
        canvas.height = Math.ceil(h * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) continue
        const target = { ctx, top: 0, dpr: scale }
        for (const p of placed) paintStroke(target, p.s.stroke, p.frame)
        ink.set(b.id, { url: canvas.toDataURL('image/png'), w, h })
      } catch (error) {
        // One box's ink picture failing must not lose the sheets.
        console.error('Could not draw the ink of a box', error)
      }
    }
  } finally {
    frame.close()
  }
  return {
    html: paperHtml(input, { imageUrl, heights, ink }),
    title: input.title,
  }
}
