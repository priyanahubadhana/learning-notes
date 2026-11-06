import { strToU8, zipSync } from 'fflate'
import type { LearningNotesDB } from '../../core/db'
import { toBase64 } from '../../core/base64'
import { isLive } from '../../core/records'
import type { StoredImage } from '../../core/types'
import { downloadFile } from '../../app/download'
import { buildDocx, type DocxImage } from './docx'
import { pageMarkdown, pageText } from './markdown'
import {
  loadExportNotebook,
  loadExportPage,
  type ExportNode,
  type ExportPage,
} from './model'
import { printHtml } from './printHtml'

/**
 * Export (J1): a page (with or without its sub-pages) or a whole notebook as
 * a PDF (through the browser's print), a Word file, Markdown or plain text,
 * then saved or sent through the share sheet.
 */

export type ExportFormat = 'pdf' | 'docx' | 'md' | 'txt'

/** What to export. `ink` is the open page's picture (words + ink), if any. */
export type ExportTarget =
  | {
      kind: 'page'
      pageId: string
      subpages?: boolean
      ink?: { png: Uint8Array; w: number; h: number } | null
    }
  | { kind: 'notebook'; notebookId: string }

/** A finished export: a file to save or share, or a document to print. */
export type ExportResult =
  | { kind: 'file'; fileName: string; blob: Blob; skipped: number }
  | { kind: 'print'; html: string; fileName: string; skipped: number }

const TYPES = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  md: 'text/markdown',
  txt: 'text/plain',
  zip: 'application/zip',
} as const

/** A name that is safe on every system. */
export const safeFileName = (title: string, fallback = 'Notes'): string =>
  title
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || fallback

function* walkNodes(nodes: readonly ExportNode[]): Generator<ExportNode> {
  for (const n of nodes) {
    yield n
    yield* walkNodes(n.children)
  }
}

function* walkPages(pages: readonly ExportPage[]): Generator<ExportPage> {
  for (const p of pages) {
    yield p
    yield* walkPages(p.children)
  }
}

/** The stored pictures the pages use. */
async function loadImages(
  db: LearningNotesDB,
  pages: readonly ExportPage[],
): Promise<Map<string, StoredImage>> {
  const ids = new Set<string>()
  for (const p of walkPages(pages))
    for (const n of walkNodes(p.nodes)) if (n.imageId) ids.add(n.imageId)
  const found = await db.images.bulkGet([...ids])
  return new Map(
    found
      .filter((i): i is StoredImage => !!i && isLive(i))
      .map((i) => [i.id, i]),
  )
}

const EXT: Record<string, 'png' | 'jpeg' | 'gif' | 'webp'> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

/** Word reads png, jpeg and gif: other kinds are redrawn as png. */
async function forWord(image: StoredImage): Promise<DocxImage | null> {
  const ext = EXT[image.type]
  if (!ext) return null
  const bytes = new Uint8Array(image.data)
  if (ext !== 'webp') {
    return { data: bytes, ext, w: image.width, h: image.height }
  }
  try {
    const bitmap = await createImageBitmap(
      new Blob([bytes], { type: image.type }),
    )
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0)
    const png = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, 'image/png'),
    )
    if (!png) return null
    return {
      data: new Uint8Array(await png.arrayBuffer()),
      ext: 'png',
      w: bitmap.width,
      h: bitmap.height,
    }
  } catch {
    return null
  }
}

/** Builds the export for a target. Nothing is written to the database. */
export async function buildExport(
  db: LearningNotesDB,
  target: ExportTarget,
  format: ExportFormat,
  options: { lang?: string } = {},
): Promise<ExportResult> {
  let pages: ExportPage[]
  let skipped: number
  let title: string
  if (target.kind === 'page') {
    const r = await loadExportPage(db, target.pageId, {
      subpages: target.subpages,
      unlocked: new Set([target.pageId]),
    })
    if (!r.page) throw new Error('Page not found')
    pages = [r.page]
    skipped = r.skipped
    title = r.page.title
    if (target.ink) {
      r.page.inkPng = target.ink.png
      r.page.inkSize = { w: target.ink.w, h: target.ink.h }
    }
  } else {
    const nb = await db.notebooks.get(target.notebookId)
    const r = await loadExportNotebook(db, target.notebookId)
    pages = r.pages
    skipped = r.skipped
    title = nb?.title ?? ''
  }
  const base = safeFileName(title)
  const images = await loadImages(db, pages)

  if (format === 'txt') {
    const text = pages.map((p) => pageText(p)).join('\n\f\n')
    return {
      kind: 'file',
      fileName: `${base}.txt`,
      blob: new Blob([text], { type: TYPES.txt }),
      skipped,
    }
  }
  if (format === 'md') {
    // Pictures go in a folder next to the file, so a zip when there are any.
    const names = new Map<string, string>()
    const files: Record<string, Uint8Array> = {}
    const ext = (i: StoredImage) => EXT[i.type] ?? 'png'
    for (const image of images.values()) {
      const name = `images/${names.size + 1}.${ext(image)}`
      names.set(image.id, name)
      files[`${base}/${name}`] = new Uint8Array(image.data)
    }
    const md = pages
      .map((p) => pageMarkdown(p, (id) => names.get(id) ?? null))
      .join('\n')
    if (names.size === 0) {
      return {
        kind: 'file',
        fileName: `${base}.md`,
        blob: new Blob([md], { type: TYPES.md }),
        skipped,
      }
    }
    files[`${base}/${base}.md`] = strToU8(md)
    return {
      kind: 'file',
      fileName: `${base}.zip`,
      blob: new Blob([zipSync(files) as BlobPart], { type: TYPES.zip }),
      skipped,
    }
  }
  if (format === 'docx') {
    const word = new Map<string, DocxImage>()
    for (const image of images.values()) {
      const converted = await forWord(image)
      if (converted) word.set(image.id, converted)
    }
    const ink = new Map<ExportPage, DocxImage>()
    for (const p of walkPages(pages)) {
      if (p.inkPng && p.inkSize)
        ink.set(p, {
          data: p.inkPng,
          ext: 'png',
          w: p.inkSize.w,
          h: p.inkSize.h,
        })
    }
    const bytes = buildDocx({ pages, images: word, ink, title })
    return {
      kind: 'file',
      fileName: `${base}.docx`,
      blob: new Blob([bytes as BlobPart], { type: TYPES.docx }),
      skipped,
    }
  }
  // PDF: a printable document; the browser's print makes the file.
  const urls = new Map<string, string>()
  for (const image of images.values()) {
    urls.set(image.id, `data:${image.type};base64,${toBase64(image.data)}`)
  }
  const inkUrls = new Map<ExportPage, string>()
  for (const p of walkPages(pages)) {
    if (p.inkPng)
      inkUrls.set(
        p,
        `data:image/png;base64,${toBase64(p.inkPng.buffer as ArrayBuffer)}`,
      )
  }
  const html = printHtml(pages, {
    title: base,
    lang: options.lang,
    imageUrl: (id) => urls.get(id),
    inkUrl: (p) => inkUrls.get(p),
  })
  return { kind: 'print', html, fileName: `${base}.pdf`, skipped }
}

/** Opens the print dialog for a document in a hidden frame. */
export async function printDocument(
  html: string,
  title: string,
): Promise<void> {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText =
    'position:fixed;inset-inline-end:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  frame.src = url
  const cleanup = () => {
    frame.remove()
    URL.revokeObjectURL(url)
  }
  await new Promise<void>((resolve, reject) => {
    frame.onload = () => resolve()
    frame.onerror = () => reject(new Error('print frame failed'))
    document.body.append(frame)
  })
  const win = frame.contentWindow
  if (!win) {
    cleanup()
    throw new Error('print frame failed')
  }
  const imgs = [...win.document.images]
  await Promise.all(imgs.map((i) => i.decode().catch(() => undefined)))
  win.document.title = title
  win.addEventListener('afterprint', () => setTimeout(cleanup, 500))
  // Some browsers never fire afterprint: tidy up after a minute.
  setTimeout(cleanup, 60_000)
  win.focus()
  win.print()
}

/** True when this browser can send the file through the share sheet. */
export function canShareFile(blob: Blob, fileName: string): boolean {
  try {
    const file = new File([blob], fileName, { type: blob.type })
    return !!navigator.canShare && navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

/** Opens the share sheet for the file; false if it was not shared. */
export async function shareFile(
  blob: Blob,
  fileName: string,
): Promise<boolean> {
  try {
    const file = new File([blob], fileName, { type: blob.type })
    if (!navigator.canShare?.({ files: [file] })) return false
    await navigator.share({ files: [file], title: fileName })
    return true
  } catch {
    // Cancelled by the user, or refused: nothing to do.
    return false
  }
}

/** Saves the file through the browser's download. */
export const saveFile = (blob: Blob, fileName: string): void =>
  downloadFile(fileName, blob, blob.type)
