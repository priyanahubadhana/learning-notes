import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadPdfjs } from '../../app/pdfjs'
import { addTextLayer, linesAsWords, type OcrWord } from './pdfEdit'

/**
 * Making a scanned PDF searchable (Q8). On the device by default: Tesseract
 * (Apache-2.0) runs in a worker from our own site, with its English reading
 * data from `public/ocr`, so no file and no picture leaves the device and
 * nothing is fetched from elsewhere. Lazy: none of it loads until Make
 * searchable is used. The words are written back as an invisible text layer,
 * so the page looks the same but can be searched, selected and copied.
 */

/** Longest side of the picture the reader sees, in pixels (about 200 dpi). */
export const OCR_SIDE = 2200

export interface OcrProgress {
  /** 1-based number of the page being read now. */
  page: number
  /** Pages to read in all. */
  total: number
  /** Pages finished. */
  done: number
  /** 0 to 1 for the whole job. */
  fraction: number
  stage: 'prepare' | 'read'
}

export interface OcrResult {
  bytes: Uint8Array
  /** Pages that got a text layer. */
  pages: number
  words: number
}

/** Pages with (almost) no text of their own: the scanned ones. */
export async function scannedPages(doc: PDFDocumentProxy): Promise<number[]> {
  const out: number[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const content = await page.getTextContent()
    const chars = content.items.reduce(
      (sum, it) => sum + ('str' in it ? it.str.trim().length : 0),
      0,
    )
    if (chars < 8) out.push(n)
    page.cleanup()
  }
  return out
}

/** Draws page `n` at about `OCR_SIDE` pixels on the long side. */
async function renderPage(
  doc: PDFDocumentProxy,
  n: number,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(n)
  const base = page.getViewport({ scale: 1 })
  const scale = Math.min(4, OCR_SIDE / Math.max(base.width, base.height))
  const vp = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(vp.width)
  canvas.height = Math.ceil(vp.height)
  await page.render({ canvas, viewport: vp }).promise
  page.cleanup()
  return canvas
}

/** Words of a recognised page, as 0 to 1 of the picture. */
export function wordsOf(
  blocks: readonly {
    paragraphs: readonly {
      lines: readonly {
        words: readonly {
          text: string
          confidence: number
          bbox: { x0: number; y0: number; x1: number; y1: number }
        }[]
      }[]
    }[]
  }[],
  width: number,
  height: number,
): OcrWord[] {
  const out: OcrWord[] = []
  for (const b of blocks) {
    for (const p of b.paragraphs) {
      for (const l of p.lines) {
        for (const w of l.words) {
          const text = w.text.trim()
          if (!text || w.confidence < 25) continue
          out.push({
            text,
            x0: Math.max(0, w.bbox.x0 / width),
            y0: Math.max(0, w.bbox.y0 / height),
            x1: Math.min(1, w.bbox.x1 / width),
            y1: Math.min(1, w.bbox.y1 / height),
          })
        }
      }
    }
  }
  return out
}

const base = (): string => import.meta.env.BASE_URL.replace(/\/?$/, '/')

async function startWorker(onStage: (fraction: number) => void) {
  const [{ createWorker }, worker, core] = await Promise.all([
    import('tesseract.js'),
    import('tesseract.js/dist/worker.min.js?url'),
    import('tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'),
  ])
  return createWorker('eng', 1, {
    workerPath: new URL(worker.default, location.href).href,
    corePath: new URL(core.default, location.href).href,
    langPath: new URL(`${base()}ocr`, location.href).href,
    gzip: true,
    // The reading data is a file of our own site, already cached by the page.
    cacheMethod: 'none',
    logger: (m) => {
      if (m.status === 'recognizing text') onStage(m.progress)
    },
  })
}

/**
 * Reads the given pages (or every scanned page) and returns the PDF with a
 * text layer. `signal` stops it between pages.
 */
export async function ocrPdf(
  bytes: ArrayBuffer,
  opts: {
    /** Only these pages; unset = every page without text. */
    pages?: number[]
    onProgress: (p: OcrProgress) => void
    signal?: AbortSignal
    message: string
  },
): Promise<OcrResult> {
  const pdfjs = await loadPdfjs()
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) })
  const doc = await task.promise
  let worker: Awaited<ReturnType<typeof startWorker>> | undefined
  try {
    const targets = opts.pages ?? (await scannedPages(doc))
    if (targets.length === 0)
      return { bytes: new Uint8Array(bytes), pages: 0, words: 0 }
    let current = 0
    let done = 0
    const report = (inner = 0, stage: OcrProgress['stage'] = 'read') =>
      opts.onProgress({
        page: targets[Math.min(done, targets.length - 1)]!,
        total: targets.length,
        done,
        fraction: Math.min(1, (done + inner) / targets.length),
        stage,
      })
    report(0, 'prepare')
    worker = await startWorker((f) => {
      current = f
      report(current)
    })
    const found = new Map<number, OcrWord[]>()
    let words = 0
    for (const n of targets) {
      if (opts.signal?.aborted) break
      const canvas = await renderPage(doc, n)
      const { data } = await worker.recognize(canvas, {}, { blocks: true })
      const list = wordsOf(data.blocks ?? [], canvas.width, canvas.height)
      canvas.width = canvas.height = 0
      if (list.length > 0) {
        found.set(n, list)
        words += list.length
      }
      done++
      current = 0
      report(0)
    }
    if (found.size === 0) {
      return { bytes: new Uint8Array(bytes), pages: 0, words: 0 }
    }
    const out = await addTextLayer(bytes, found, opts.message)
    return { bytes: out, pages: found.size, words }
  } finally {
    await worker?.terminate().catch(() => undefined)
    void task.destroy()
  }
}

/** Adds AI-read text to pages (line by line; see `linesAsWords`). */
export async function addAiText(
  bytes: ArrayBuffer | Uint8Array,
  texts: ReadonlyMap<number, string>,
  message: string,
): Promise<Uint8Array> {
  const map = new Map<number, OcrWord[]>()
  for (const [n, text] of texts) {
    const words = linesAsWords(text)
    if (words.length) map.set(n, words)
  }
  return addTextLayer(bytes, map, message)
}
