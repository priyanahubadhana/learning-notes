import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib'
import type { InkChunk, Stroke } from '../../core/inkTypes'
import type { Annotation, HighlightColour } from '../../core/types'
import { blankSize, type PagePlan, type PageSize } from './pageOps'

/**
 * The PDF engine of the PDF menu (Q8): pdf-lib (MIT, free), loaded only when
 * a tool is used. Pages are copied into a new document in the planned order,
 * turned, dropped or added; files are combined; annotations are flattened onto
 * the pages; an invisible text layer makes scanned pages searchable.
 */

let loading: Promise<typeof import('pdf-lib')> | undefined
export const loadPdfLib = () => (loading ??= import('pdf-lib'))

export class PdfEditError extends Error {}

/** Opens a PDF for editing; a locked or damaged file gets a plain message. */
export async function openForEdit(
  bytes: ArrayBuffer | Uint8Array,
  message: string,
): Promise<PDFDocument> {
  const lib = await loadPdfLib()
  try {
    const u8 = ArrayBuffer.isView(bytes) ? bytes : new Uint8Array(bytes)
    return await lib.PDFDocument.load(u8, { updateMetadata: false })
  } catch {
    throw new PdfEditError(message)
  }
}

// ---- Page geometry ----

/** Where a page sits: its visible box and its own turn. */
export interface Geo {
  x: number
  y: number
  w: number
  h: number
  rot: 0 | 90 | 180 | 270
}

export function geoOf(page: PDFPage): Geo {
  const box = page.getCropBox()
  const a = ((page.getRotation().angle % 360) + 360) % 360
  const rot = (a === 90 || a === 180 || a === 270 ? a : 0) as Geo['rot']
  return { x: box.x, y: box.y, w: box.width, h: box.height, rot }
}

/** Size as shown (the turn applied). */
export const shownSize = (g: Geo): PageSize =>
  g.rot === 90 || g.rot === 270 ? { w: g.h, h: g.w } : { w: g.w, h: g.h }

/** A point in the shown page (points from the top-left) to PDF user space. */
export function toUser(
  g: Geo,
  dx: number,
  dy: number,
): { x: number; y: number } {
  switch (g.rot) {
    case 90:
      return { x: g.x + dy, y: g.y + dx }
    case 180:
      return { x: g.x + g.w - dx, y: g.y + dy }
    case 270:
      return { x: g.x + g.w - dy, y: g.y + g.h - dx }
    default:
      return { x: g.x + dx, y: g.y + g.h - dy }
  }
}

/** Sizes of all pages as shown. */
export async function pageSizesOf(
  bytes: ArrayBuffer,
  message: string,
): Promise<PageSize[]> {
  const doc = await openForEdit(bytes, message)
  return doc.getPages().map((p) => shownSize(geoOf(p)))
}

// ---- Page edits ----

/** The new file for a plan (see `pageOps`). */
export async function applyPlan(
  bytes: ArrayBuffer | Uint8Array,
  plan: PagePlan,
  message: string,
): Promise<Uint8Array> {
  if (plan.length === 0) throw new PdfEditError(message)
  const lib = await loadPdfLib()
  const src = await openForEdit(bytes, message)
  const sizes = src.getPages().map((p) => shownSize(geoOf(p)))
  const out = await lib.PDFDocument.create()
  const wanted = [
    ...new Set(plan.flatMap((p) => (p.from === null ? [] : [p.from - 1]))),
  ]
  const copies = await out.copyPages(src, wanted)
  const byOld = new Map(wanted.map((o, i) => [o, copies[i]!]))
  const used = new Set<number>()
  plan.forEach((item, i) => {
    if (item.from === null) {
      const s = blankSize(plan, i, sizes)
      out.addPage([s.w, s.h])
      return
    }
    let page = byOld.get(item.from - 1)!
    // The same old page twice (not offered by the screen) needs its own copy.
    if (used.has(item.from)) return
    used.add(item.from)
    page = out.addPage(page)
    if (item.turn) {
      const now = page.getRotation().angle
      page.setRotation(lib.degrees((now + item.turn) % 360))
    }
  })
  carryInfo(src, out)
  return out.save()
}

/** Title, author and subject travel to the new file. */
function carryInfo(from: PDFDocument, to: PDFDocument) {
  const title = from.getTitle()
  if (title) to.setTitle(title)
  const author = from.getAuthor()
  if (author) to.setAuthor(author)
  const subject = from.getSubject()
  if (subject) to.setSubject(subject)
}

/** Several PDFs, one after the other, as one file. */
export async function combineFiles(
  files: readonly (ArrayBuffer | Uint8Array)[],
  message: string,
  title?: string,
): Promise<Uint8Array> {
  if (files.length === 0) throw new PdfEditError(message)
  const lib = await loadPdfLib()
  const out = await lib.PDFDocument.create()
  for (const bytes of files) {
    const src = await openForEdit(bytes, message)
    const pages = await out.copyPages(src, src.getPageIndices())
    for (const p of pages) out.addPage(p)
  }
  if (title) out.setTitle(title)
  return out.save()
}

// ---- Pictures to PDF (Scan to PDF) ----

export interface ScanPage {
  /** A JPEG of the straightened page. */
  jpeg: Uint8Array
  /** Pixels. */
  width: number
  height: number
}

/** One A4-wide page per picture, the picture filling it. */
export async function picturesToPdf(
  pages: readonly ScanPage[],
  message: string,
  title?: string,
): Promise<Uint8Array> {
  if (pages.length === 0) throw new PdfEditError(message)
  const lib = await loadPdfLib()
  const out = await lib.PDFDocument.create()
  for (const p of pages) {
    const img = await out.embedJpg(p.jpeg)
    const w = 595.28
    const h = (w * p.height) / p.width
    out.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h })
  }
  if (title) out.setTitle(title)
  return out.save()
}

// ---- Searchable text (OCR) ----

/** A recognised word: its box as 0 to 1 of the shown page. */
export interface OcrWord {
  text: string
  x0: number
  y0: number
  x1: number
  y1: number
}

/** Characters a standard font can draw; the rest are dropped. */
function drawable(font: PDFFont, text: string): string {
  const set = new Set(font.getCharacterSet())
  let out = ''
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    out += cp === 0xa0 ? ' ' : set.has(cp) ? ch : ''
  }
  return out
}

/** Draws invisible text under the pictures of the given pages (1 to n). */
export async function addTextLayer(
  bytes: ArrayBuffer | Uint8Array,
  words: ReadonlyMap<number, readonly OcrWord[]>,
  message: string,
): Promise<Uint8Array> {
  const lib = await loadPdfLib()
  const doc = await openForEdit(bytes, message)
  const font = await doc.embedFont(lib.StandardFonts.Helvetica)
  const pages = doc.getPages()
  for (const [no, list] of words) {
    const page = pages[no - 1]
    if (!page || list.length === 0) continue
    const g = geoOf(page)
    const shown = shownSize(g)
    page.pushOperators(
      lib.pushGraphicsState(),
      lib.setTextRenderingMode(lib.TextRenderingMode.Invisible),
    )
    for (const w of list) {
      const text = drawable(font, w.text).trim()
      if (!text) continue
      const boxW = (w.x1 - w.x0) * shown.w
      const boxH = (w.y1 - w.y0) * shown.h
      if (!(boxW > 0) || !(boxH > 0)) continue
      const natural = font.widthOfTextAtSize(text, 1) || 1
      const size = Math.min(boxH * 1.4, Math.max(boxH * 0.4, boxW / natural))
      // The baseline sits a little above the bottom of the box.
      const at = toUser(g, w.x0 * shown.w, w.y1 * shown.h - boxH * 0.2)
      page.drawText(text, {
        x: at.x,
        y: at.y,
        size,
        font,
        rotate: lib.degrees(g.rot),
      })
    }
    page.pushOperators(lib.popGraphicsState())
  }
  return doc.save()
}

/** Spreads plain text over a page as lines from top to bottom (AI reading). */
export function linesAsWords(text: string): OcrWord[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []
  const slot = Math.min(0.05, 0.9 / lines.length)
  return lines.map((line, i) => ({
    text: line,
    x0: 0.06,
    x1: 0.94,
    y0: 0.05 + i * slot,
    y1: 0.05 + i * slot + slot * 0.9,
  }))
}

// ---- Export with the user's marks flattened in ----

const HIGHLIGHT_RGB: Record<HighlightColour, [number, number, number]> = {
  yellow: [0.98, 0.8, 0.08],
  green: [0.29, 0.87, 0.5],
  blue: [0.38, 0.65, 0.98],
  pink: [0.96, 0.45, 0.71],
  purple: [0.75, 0.52, 0.99],
}

/** `#rgb`, `#rrggbb` or `rgb(r, g, b)` as 0 to 1 numbers; black when unknown. */
export function parseColour(css: string): [number, number, number] {
  const c = css.trim()
  let m = /^#([0-9a-f]{3})$/i.exec(c)
  if (m) {
    const h = m[1]!
    return [0, 1, 2].map((i) => parseInt(h[i]! + h[i]!, 16) / 255) as [
      number,
      number,
      number,
    ]
  }
  m = /^#([0-9a-f]{6})/i.exec(c)
  if (m) {
    const h = m[1]!
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [
      number,
      number,
      number,
    ]
  }
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(c)
  if (rgb) return [+rgb[1]! / 255, +rgb[2]! / 255, +rgb[3]! / 255]
  return [0, 0, 0]
}

const PDF_BLOCK = /^pdf:(\d{1,6})$/

export interface FlattenInput {
  annotations: readonly Annotation[]
  chunks: readonly InkChunk[]
  /** Titles for the notes list at the end. */
  labels: { notes: string; page: string }
}

/** Wraps text into lines that fit `maxW` points. */
export function wrapLines(
  font: Pick<PDFFont, 'widthOfTextAtSize'>,
  text: string,
  size: number,
  maxW: number,
): string[] {
  const out: string[] = []
  for (const para of text.split(/\r?\n/)) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (line && font.widthOfTextAtSize(next, size) > maxW) {
        out.push(line)
        line = word
      } else line = next
    }
    out.push(line)
  }
  return out
}

function drawStroke(
  lib: typeof import('pdf-lib'),
  page: PDFPage,
  g: Geo,
  s: Stroke,
) {
  const shown = shownSize(g)
  const unit = shown.w // points are in page widths
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i + 1 < s.pts.length; i += 6) {
    const p = toUser(g, s.pts[i]! * unit, s.pts[i + 1]! * unit)
    const last = pts[pts.length - 1]
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.25) pts.push(p)
  }
  if (pts.length === 0) return
  const [r, gr, b] = parseColour(s.style.colour)
  const color = lib.rgb(r, gr, b)
  const thickness = Math.max(0.3, (s.style.width / (s.bw || 1)) * unit)
  if (s.kind === 'tape') {
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    page.drawRectangle({
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      color,
    })
    return
  }
  const opacity = Math.min(1, Math.max(0.05, s.style.opacity || 1))
  if (pts.length === 1) {
    page.drawCircle({
      x: pts[0]!.x,
      y: pts[0]!.y,
      size: thickness / 2,
      color,
      opacity,
    })
    return
  }
  for (let i = 1; i < pts.length; i++) {
    page.drawLine({
      start: pts[i - 1]!,
      end: pts[i]!,
      thickness,
      color,
      opacity,
      lineCap: lib.LineCapStyle.Round,
    })
  }
}

/** The file with the reader's highlights, notes and ink drawn onto its pages. */
export async function flattenMarks(
  bytes: ArrayBuffer | Uint8Array,
  input: FlattenInput,
  message: string,
): Promise<Uint8Array> {
  const lib = await loadPdfLib()
  const doc = await openForEdit(bytes, message)
  const pages = doc.getPages()
  const geos = pages.map(geoOf)
  const font = await doc.embedFont(lib.StandardFonts.Helvetica)

  // Highlights first, so the ink and notes sit above them.
  const notes: { n: number; page: number; text: string }[] = []
  for (const a of input.annotations) {
    if (a.deletedAt !== null || a.anchor.type !== 'pdf') continue
    const no = a.anchor.page
    const page = pages[no - 1]
    const g = geos[no - 1]
    if (!page || !g) continue
    const shown = shownSize(g)
    if (a.kind === 'highlight' || a.kind === 'note') {
      const rgb = HIGHLIGHT_RGB[a.colour ?? 'yellow']
      const r = a.anchor.rects
      for (let i = 0; i + 3 < r.length; i += 4) {
        const x = r[i]! * shown.w
        const y = r[i + 1]! * shown.h
        const w = r[i + 2]! * shown.w
        const h = r[i + 3]! * shown.h
        const p1 = toUser(g, x, y)
        const p2 = toUser(g, x + w, y + h)
        page.drawRectangle({
          x: Math.min(p1.x, p2.x),
          y: Math.min(p1.y, p2.y),
          width: Math.abs(p2.x - p1.x),
          height: Math.abs(p2.y - p1.y),
          color: lib.rgb(...rgb),
          opacity: 0.4,
          blendMode: lib.BlendMode.Multiply,
        })
      }
    }
  }
  for (const c of input.chunks) {
    const m = PDF_BLOCK.exec(c.blockId ?? '')
    if (!m || c.deletedAt !== null) continue
    const page = pages[Number(m[1]) - 1]
    const g = geos[Number(m[1]) - 1]
    if (!page || !g) continue
    // Highlighter strokes first (they sit behind the ink).
    for (const s of c.strokes.filter((x) => x.kind === 'highlight')) {
      drawStroke(lib, page, g, s)
    }
  }
  for (const c of input.chunks) {
    const m = PDF_BLOCK.exec(c.blockId ?? '')
    if (!m || c.deletedAt !== null) continue
    const page = pages[Number(m[1]) - 1]
    const g = geos[Number(m[1]) - 1]
    if (!page || !g) continue
    for (const s of c.strokes.filter((x) => x.kind !== 'highlight')) {
      drawStroke(lib, page, g, s)
    }
  }
  // Notes: a small numbered marker on the page, the words on pages at the end.
  const ordered = input.annotations
    .filter(
      (a) =>
        a.deletedAt === null &&
        a.anchor.type === 'pdf' &&
        a.kind === 'note' &&
        !!a.note?.trim(),
    )
    .sort(
      (a, b) =>
        (a.anchor as { page: number }).page -
        (b.anchor as { page: number }).page,
    )
  for (const a of ordered) {
    if (a.anchor.type !== 'pdf') continue
    const no = a.anchor.page
    const page = pages[no - 1]
    const g = geos[no - 1]
    if (!page || !g) continue
    const n = notes.length + 1
    notes.push({ n, page: no, text: a.note!.trim() })
    const shown = shownSize(g)
    const r = a.anchor.rects
    const tx = Math.min(0.97, (r[0] ?? 0) + (r[2] ?? 0)) * shown.w
    const ty = (r[1] ?? 0) * shown.h
    const at = toUser(g, tx, ty)
    page.drawCircle({
      x: at.x,
      y: at.y,
      size: 6,
      color: lib.rgb(0.98, 0.8, 0.08),
      borderColor: lib.rgb(0.4, 0.3, 0),
      borderWidth: 0.6,
    })
    const label = String(n)
    page.drawText(label, {
      x: at.x - font.widthOfTextAtSize(label, 7) / 2,
      y: at.y - 2.4,
      size: 7,
      font,
      color: lib.rgb(0, 0, 0),
    })
  }
  if (notes.length > 0) {
    const bold = await doc.embedFont(lib.StandardFonts.HelveticaBold)
    const W = 595.28
    const H = 841.89
    const margin = 56
    let page = doc.addPage([W, H])
    let y = H - margin
    const head = drawable(font, input.labels.notes) || 'Notes'
    page.drawText(head, { x: margin, y, size: 18, font: bold })
    y -= 30
    for (const n of notes) {
      const body = drawable(font, n.text) || '-'
      const lines = wrapLines(font, body, 11, W - margin * 2 - 24)
      const need = (lines.length + 1) * 15 + 8
      if (y - need < margin) {
        page = doc.addPage([W, H])
        y = H - margin
      }
      const tag = `${n.n}.  ${drawable(font, input.labels.page)} ${n.page}`
      page.drawText(tag, { x: margin, y, size: 9, font: bold })
      y -= 15
      for (const line of lines) {
        page.drawText(line, { x: margin + 24, y, size: 11, font })
        y -= 15
      }
      y -= 8
    }
  }
  return doc.save()
}
