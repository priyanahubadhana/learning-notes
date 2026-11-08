import { unzipSync, strFromU8 } from 'fflate'

/**
 * Reading a slide deck for the Slides tab. NotebookLM's PowerPoint holds each
 * slide as a picture (the text is not editable), so the strip shows those
 * pictures in slide order. Nothing is run or opened: the zip is only read.
 */

export interface SlidePicture {
  name: string
  mime: string
  data: Uint8Array
}

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

/** Most pictures read from one deck and the biggest zip accepted (50 MB, as attachments). */
const MAX_SLIDES = 300

/** The picture of each slide of a .pptx, in slide order (slides with no picture are skipped). */
export function pptxSlides(bytes: Uint8Array): SlidePicture[] {
  const files = unzipSync(bytes, {
    filter: (f) =>
      /^ppt\/(slides\/_rels\/slide\d+\.xml\.rels|media\/[^/]+)$/i.test(f.name),
  })
  const rels = Object.keys(files)
    .map((n) => ({ n, no: Number(/slide(\d+)\.xml\.rels$/i.exec(n)?.[1]) }))
    .filter((r) => Number.isFinite(r.no))
    .sort((a, b) => a.no - b.no)
    .slice(0, MAX_SLIDES)
  const out: SlidePicture[] = []
  for (const { n } of rels) {
    const xml = strFromU8(files[n])
    for (const m of xml.matchAll(/Target="\.\.\/media\/([^"/]+)"/gi)) {
      const media = files[`ppt/media/${m[1]}`]
      const ext = m[1].split('.').pop()?.toLowerCase() ?? ''
      if (media && MIME[ext]) {
        out.push({ name: m[1], mime: MIME[ext], data: media })
        break
      }
    }
  }
  return out
}
