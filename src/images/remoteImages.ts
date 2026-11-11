import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { imageRef, MAX_IMAGE_BYTES, MAX_IMAGE_SIDE } from './imageRef'
import { saveImage } from './imageService'
import { shrinkImage } from './shrinkImage'

/**
 * Pictures from the web. A page never loads one silently: pasted or opened
 * content could use a picture address to learn when and from where a note
 * was read. Instead:
 *  - on paste, each web picture is copied once into the app's own storage
 *    (when its server allows it), so the note shows a local copy for good;
 *  - any web picture still in a note shows a "Load remote image" card until
 *    the person taps it (which tries a local copy first, and only then loads
 *    it from the web for this visit).
 * Only raster pictures are copied (an SVG is drawn to a bitmap, never kept
 * or shown as markup).
 */

export const isRemoteUrl = (url: string): boolean => /^https?:\/\//i.test(url)

// ---- The tap-to-load card --------------------------------------------------

const approved = new Set<string>()
/** Web pictures the person chose to load in this visit. */
export const isApproved = (url: string): boolean => approved.has(url)
export const approveRemote = (url: string): void => void approved.add(url)
export const unapproveRemote = (url: string): void => void approved.delete(url)

const CARD_HEAD = '<svg data-ln-remote="1"'
const CARD_PREFIX = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(CARD_HEAD)}`

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** The card that stands in for a web picture (a data: image: it loads nothing). */
export function placeholderSrc(url: string): string {
  let host = ''
  try {
    host = new URL(url).hostname
  } catch {
    // No host line.
  }
  const font = 'font-family="-apple-system,system-ui,sans-serif"'
  const svg =
    `${CARD_HEAD} xmlns="http://www.w3.org/2000/svg" width="480" height="150" viewBox="0 0 480 150">` +
    `<rect x="1" y="1" width="478" height="148" rx="14" fill="#f2f2f7" stroke="#c7c7cc"/>` +
    `<text x="240" y="70" text-anchor="middle" ${font} font-size="19" font-weight="600" fill="#1c1c1e">${esc(t('image.remote.load'))}</text>` +
    `<text x="240" y="98" text-anchor="middle" ${font} font-size="13" fill="#6c6c70">${esc(host.slice(0, 48))}</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export const isPlaceholder = (src: string): boolean =>
  src.startsWith(CARD_PREFIX)

/** What the editor shows for a picture address: the card for an unapproved web picture. */
export const displayUrl = (url: string): string =>
  isRemoteUrl(url) && !isApproved(url) ? placeholderSrc(url) : url

/**
 * The address to read a picture from when copying: the editor's own, except
 * that a web picture still behind its card stays an address (it is never
 * fetched, nor swapped for the card, just to be copied).
 */
export async function resolveForCopy(
  editor: { resolveFileUrl?: (url: string) => Promise<string> },
  src: string,
): Promise<string> {
  const url = editor.resolveFileUrl ? await editor.resolveFileUrl(src) : src
  return isPlaceholder(url) ? src : url
}

// ---- Copying a web picture into the app ---------------------------------------

/**
 * Gets a web picture as a bitmap blob. Null when its server forbids it (no
 * CORS), it is slow, or it is not a picture. Uses an image element, not
 * fetch, so it works under the app's connect-src rule.
 */
export function fetchViaCanvas(
  url: string,
  timeoutMs = 6000,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'
    let finished = false
    const done = (blob: Blob | null) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      img.onload = img.onerror = null
      resolve(blob)
    }
    const timer = setTimeout(() => done(null), timeoutMs)
    img.onerror = () => done(null)
    img.onload = () => {
      try {
        const w0 = img.naturalWidth
        const h0 = img.naturalHeight
        if (!w0 || !h0) return done(null)
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(w0, h0))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(w0 * scale))
        canvas.height = Math.max(1, Math.round(h0 * scale))
        canvas
          .getContext('2d')
          ?.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (b) => done(b && b.size <= MAX_IMAGE_BYTES ? b : null),
          'image/webp',
          0.86,
        )
      } catch {
        done(null) // a canvas the server's picture tainted
      }
    }
    img.src = url
  })
}

export type ImageFetcher = (url: string) => Promise<Blob | null>

/** Web address → its local copy's reference (kept for the visit, so a repeat does not store twice). */
const copies = new Map<string, Promise<string | null>>()

/** Copies one web picture into the app; its "lnimg:" reference, or null. */
export function localizeUrl(
  db: LearningNotesDB,
  url: string,
  fetcher: ImageFetcher = fetchViaCanvas,
): Promise<string | null> {
  if (!/^https:\/\//i.test(url)) return Promise.resolve(null)
  let hit = copies.get(url)
  if (!hit) {
    hit = (async () => {
      try {
        const blob = await fetcher(url)
        if (!blob) return null
        return imageRef((await saveImage(db, blob, shrinkImage)).id)
      } catch {
        return null
      }
    })()
    copies.set(url, hit)
    void hit.then((ref) => ref === null && copies.delete(url))
  }
  return hit
}

/** Most pictures copied from one paste, and the longest the paste may wait for them. */
export const MAX_PASTE_IMAGES = 12
export const PASTE_BUDGET_MS = 4000

/** Copies many; addresses not done by the deadline are left out (the card covers them). */
async function localizeMany(
  db: LearningNotesDB,
  urls: string[],
  fetcher: ImageFetcher,
  budgetMs: number,
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const work = urls.slice(0, MAX_PASTE_IMAGES).map(async (url) => {
    const ref = await localizeUrl(db, url, fetcher)
    if (ref) out.set(url, ref)
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  await Promise.race([
    Promise.all(work),
    new Promise((res) => (timer = setTimeout(res, budgetMs))),
  ])
  clearTimeout(timer)
  return new Map(out)
}

/** Does pasted HTML or Markdown point at a picture on the web (https)? */
export const hasWebPictures = (text: string): boolean =>
  HAS_REMOTE_IMG.test(text) || /!\[[^\]]*\]\(https:\/\//.test(text)

const HAS_REMOTE_IMG = /<img\b[^>]*\bsrc\s*=\s*["']?https:/i

/** Pasted (already cleaned) HTML with its web pictures swapped for local copies. */
export async function localizeHtml(
  db: LearningNotesDB,
  html: string,
  fetcher: ImageFetcher = fetchViaCanvas,
  budgetMs = PASTE_BUDGET_MS,
): Promise<string> {
  if (!HAS_REMOTE_IMG.test(html)) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const imgs = [...doc.querySelectorAll('img')].filter((i) =>
    /^https:\/\//i.test(i.getAttribute('src') ?? ''),
  )
  const refs = await localizeMany(
    db,
    [...new Set(imgs.map((i) => i.getAttribute('src')!))],
    fetcher,
    budgetMs,
  )
  for (const img of imgs) {
    const ref = refs.get(img.getAttribute('src')!)
    if (ref) img.setAttribute('src', ref)
  }
  return doc.body.innerHTML
}

const MD_IMAGE = /!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)/g

/** Pasted Markdown with its web pictures swapped for local copies. */
export async function localizeMarkdown(
  db: LearningNotesDB,
  markdown: string,
  fetcher: ImageFetcher = fetchViaCanvas,
  budgetMs = PASTE_BUDGET_MS,
): Promise<string> {
  const urls = [...new Set([...markdown.matchAll(MD_IMAGE)].map((m) => m[2]))]
  if (urls.length === 0) return markdown
  const refs = await localizeMany(db, urls, fetcher, budgetMs)
  return markdown.replace(MD_IMAGE, (whole, alt: string, url: string) => {
    const ref = refs.get(url)
    return ref ? `![${alt}](${ref})` : whole
  })
}

// ---- Tapping a card in the editor ---------------------------------------------

interface WatchedEditor {
  domElement?: HTMLElement
  getBlock(
    id: string,
  ): { type: string; props?: Record<string, unknown> } | undefined
  updateBlock(block: never, update: { props: { url: string } }): unknown
}

/**
 * Turns a tap on a "Load remote image" card into the picture: a local copy
 * when the server allows one, otherwise the web picture itself for this visit.
 */
export function watchRemoteImages(
  editor: WatchedEditor,
  db: LearningNotesDB,
  onFailed: () => void,
): () => void {
  const onClick = (e: MouseEvent) => {
    const img = e.target instanceof HTMLImageElement ? e.target : null
    if (!img || !isPlaceholder(img.src) || !editor.domElement?.contains(img))
      return
    const id = img.closest('[data-id]')?.getAttribute('data-id')
    const block = id ? editor.getBlock(id) : undefined
    const url = block?.props?.url
    if (!block || block.type !== 'image' || typeof url !== 'string') return
    e.preventDefault()
    e.stopPropagation()
    img.style.opacity = '0.5'
    void (async () => {
      const ref = await localizeUrl(db, url)
      if (ref) {
        editor.updateBlock(block as never, { props: { url: ref } })
        return
      }
      approveRemote(url)
      img.style.opacity = ''
      img.onerror = () => {
        unapproveRemote(url)
        img.onerror = null
        img.src = placeholderSrc(url)
        onFailed()
      }
      img.referrerPolicy = 'no-referrer'
      img.src = url
    })()
  }
  window.addEventListener('click', onClick, true)
  return () => window.removeEventListener('click', onClick, true)
}
