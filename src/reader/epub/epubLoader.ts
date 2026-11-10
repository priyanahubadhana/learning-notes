import { strFromU8, unzipSync } from 'fflate'

/**
 * What foliate-js's EPUB class asks of a "zip loader": the entries and three
 * readers. Built on fflate (already in the app) instead of foliate's own
 * zip.js, so that library is not shipped. The whole archive is unpacked in
 * memory once; EPUBs are small next to the 300 MB import cap.
 */
export interface EpubLoader {
  entries: { filename: string }[]
  loadText: (name: string) => string | null
  loadBlob: (name: string, type?: string) => Blob | null
  getSize: (name: string) => number
}

export function makeEpubLoader(bytes: Uint8Array): EpubLoader {
  const files = unzipSync(bytes)
  const has = (name: string) =>
    Object.prototype.hasOwnProperty.call(files, name)
  return {
    entries: Object.keys(files).map((filename) => ({ filename })),
    loadText: (name) => (has(name) ? strFromU8(files[name]) : null),
    loadBlob: (name, type) =>
      has(name)
        ? new Blob([files[name].slice().buffer as ArrayBuffer], {
            type: type ?? '',
          })
        : null,
    getSize: (name) => (has(name) ? files[name].length : 0),
  }
}

/** CSS put into every EPUB page: the app's colours, text size and spacing. */
export function epubCss(opts: {
  size: number
  bg: string
  ink: string
  /** More CSS (font, spacing, margins from the Aa sheet). */
  extra?: string
  /** The app's selection colour (--color-select); the tint is 22% of it. */
  select?: string
}): string {
  return `
    html { font-size: ${Math.round(opts.size)}% !important; }
    body { background: ${opts.bg} !important; color: ${opts.ink} !important; }
    p, li, blockquote, dd { line-height: 1.6; }
    a:link, a:visited { color: inherit; text-decoration: underline; }
    img, svg { max-width: 100%; height: auto; }
    /* One subtle selection look everywhere (item 42): a soft tint, no outline. */
    ::selection { background: color-mix(in srgb, ${opts.select || '#0d9488'} 22%, transparent); color: inherit; }
    ::highlight(reading-word) { background-color: color-mix(in srgb, ${opts.select || '#0d9488'} 45%, transparent); }
    ::highlight(reading-sentence) { background-color: color-mix(in srgb, ${opts.select || '#0d9488'} 22%, transparent); }
    ${opts.extra ?? ''}
  `
}

/** Smallest and largest text size (percent) the EPUB view offers. */
const EPUB_SIZES = [80, 90, 100, 110, 125, 150, 175, 200]

/** The next size up or down the list (stays at the ends). */
export function stepSize(current: number, dir: 1 | -1): number {
  const i = EPUB_SIZES.findIndex((s) => s >= current)
  const at = i === -1 ? EPUB_SIZES.length - 1 : i
  return EPUB_SIZES[Math.min(EPUB_SIZES.length - 1, Math.max(0, at + dir))]
}

/** A flat list from foliate's nested table of contents. */
export interface TocNode {
  label?: string
  href?: string
  subitems?: TocNode[] | null
}
export function flattenToc(
  toc: readonly TocNode[] | undefined,
  depth = 0,
  out: { title: string; href: string; depth: number }[] = [],
): { title: string; href: string; depth: number }[] {
  for (const node of toc ?? []) {
    if (out.length >= 500) break
    if (node.label && node.href) {
      out.push({
        title: node.label.trim().slice(0, 200),
        href: node.href,
        depth,
      })
    }
    if (node.subitems?.length) flattenToc(node.subitems, depth + 1, out)
  }
  return out
}
