import { strFromU8, unzipSync } from 'fflate'
import { loadPdfjs } from '../app/pdfjs'
import type { BookFormat } from '../core/bookFormat'
import type { BookInspector, BookMeta } from './libraryService'
import { titleFromFileName } from './libraryService'

/**
 * Reads titles, authors, covers and text out of book files, in the browser.
 * Libraries (pdf.js, mammoth) are loaded on demand.
 */

const COVER_WIDTH = 300

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | undefined> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (webp) => {
        if (webp && webp.type === 'image/webp') return resolve(webp)
        canvas.toBlob((png) => resolve(png ?? undefined), 'image/png')
      },
      'image/webp',
      0.8,
    )
  })
}

async function pdfMeta(bytes: Uint8Array, name: string): Promise<BookMeta> {
  const pdfjs = await loadPdfjs()
  // pdf.js takes (and detaches) the array it is given: hand it a copy.
  const task = pdfjs.getDocument({ data: bytes.slice() })
  const doc = await task.promise
  try {
    const info = (await doc.getMetadata().catch(() => null))?.info as
      { Title?: unknown; Author?: unknown } | undefined
    const meta: BookMeta = {
      pageCount: doc.numPages,
      title:
        typeof info?.Title === 'string' && info.Title.trim()
          ? info.Title
          : titleFromFileName(name),
      author:
        typeof info?.Author === 'string' && info.Author.trim()
          ? info.Author
          : undefined,
    }
    try {
      const page = await doc.getPage(1)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: COVER_WIDTH / base.width })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      await page.render({ canvas, viewport }).promise
      meta.cover = await canvasToBlob(canvas)
    } catch (e) {
      console.error('No cover from the PDF', e)
    }
    return meta
  } finally {
    void task.destroy()
  }
}

/** First `<tag>` text of an XML string (enough for the few fields we need). */
const tagText = (xml: string, tag: string): string | undefined => {
  const m = new RegExp(`<(?:\\w+:)?${tag}[^>]*>([^<]*)<`, 'i').exec(xml)
  return m ? m[1].trim() || undefined : undefined
}

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")

/** Resolves `href` against the folder of `base` ("OEBPS/content.opf"). */
function resolvePath(base: string, href: string): string {
  const dir = base.includes('/') ? base.slice(0, base.lastIndexOf('/') + 1) : ''
  const parts = (dir + decodeURIComponent(href.split('#')[0])).split('/')
  const out: string[] = []
  for (const p of parts) {
    if (p === '..') out.pop()
    else if (p && p !== '.') out.push(p)
  }
  return out.join('/')
}

async function epubMeta(bytes: Uint8Array, name: string): Promise<BookMeta> {
  const files = unzipSync(bytes, {
    filter: (f) =>
      f.name === 'META-INF/container.xml' ||
      /\.opf$/i.test(f.name) ||
      /\.(jpe?g|png|webp|gif)$/i.test(f.name),
  })
  const container = files['META-INF/container.xml']
  const opfPath =
    container && /full-path="([^"]+)"/.exec(strFromU8(container))?.[1]
  const opfBytes = opfPath ? files[opfPath] : undefined
  const meta: BookMeta = { title: titleFromFileName(name) }
  if (!opfPath || !opfBytes) return meta
  const opf = strFromU8(opfBytes)
  const title = tagText(opf, 'title')
  const author = tagText(opf, 'creator')
  if (title) meta.title = decodeEntities(title)
  if (author) meta.author = decodeEntities(author)
  // The cover: <meta name="cover" content="id"> → item id → href, or the
  // item with properties="cover-image".
  const coverId = /<meta[^>]+name="cover"[^>]+content="([^"]+)"/i.exec(opf)?.[1]
  const items = [...opf.matchAll(/<item\b[^>]*>/gi)].map((m) => m[0])
  const attr = (item: string, a: string) =>
    new RegExp(`${a}="([^"]*)"`, 'i').exec(item)?.[1]
  const item =
    items.find((i) => attr(i, 'properties')?.includes('cover-image')) ??
    items.find((i) => coverId && attr(i, 'id') === coverId)
  const href = item && attr(item, 'href')
  const data = href ? files[resolvePath(opfPath, href)] : undefined
  const type = item && attr(item, 'media-type')
  if (data && type && /^image\/(jpeg|png|webp|gif)$/.test(type)) {
    meta.cover = new Blob([data.slice().buffer as ArrayBuffer], { type })
  }
  return meta
}

/** A plain title card (DOCX and EPUBs with no cover): colour and the title. */
async function titleCover(title: string): Promise<Blob | undefined> {
  const canvas = document.createElement('canvas')
  canvas.width = COVER_WIDTH
  canvas.height = Math.round(COVER_WIDTH * 1.4)
  const g = canvas.getContext('2d')
  if (!g) return undefined
  let hue = 0
  for (const c of title) hue = (hue * 31 + c.charCodeAt(0)) % 360
  g.fillStyle = `hsl(${hue} 35% 38%)`
  g.fillRect(0, 0, canvas.width, canvas.height)
  g.fillStyle = '#fff'
  g.font = '600 28px system-ui, sans-serif'
  g.textBaseline = 'top'
  const words = title.split(/\s+/)
  let line = ''
  let y = 36
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (g.measureText(next).width > COVER_WIDTH - 48 && line) {
      g.fillText(line, 24, y)
      y += 36
      line = w
    } else line = next
    if (y > canvas.height - 60) break
  }
  if (line) g.fillText(line, 24, y)
  return canvasToBlob(canvas)
}

async function docxMeta(bytes: Uint8Array, name: string): Promise<BookMeta> {
  const mammoth = await import('mammoth')
  const result = await mammoth.convertToHtml({
    arrayBuffer: bytes.slice().buffer as ArrayBuffer,
  })
  const title = titleFromFileName(name)
  return { title, docxHtml: result.value, cover: await titleCover(title) }
}

/** The browser's book inspector. */
export const inspectBook: BookInspector = async (format, bytes, name) => {
  const meta = await inspectFormat(format, bytes, name)
  if (!meta.cover && meta.title) {
    try {
      meta.cover = await titleCover(meta.title)
    } catch {
      /* a book without a cover is fine */
    }
  }
  return meta
}

function inspectFormat(
  format: BookFormat,
  bytes: Uint8Array,
  name: string,
): Promise<BookMeta> {
  return format === 'pdf'
    ? pdfMeta(bytes, name)
    : format === 'epub'
      ? epubMeta(bytes, name)
      : docxMeta(bytes, name)
}
