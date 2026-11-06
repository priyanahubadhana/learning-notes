import type { InkApi } from './inkRuntime'
import { paintBlocks } from './paintBlocks'
import { paintStroke, type Target } from './render'

/**
 * A picture of the open page as drawn: its words and pictures with all
 * visible ink on top (J1, for Word and PDF files). Null when the page has no
 * visible ink. The picture is capped at 12 million pixels so an iPad never
 * runs out of canvas memory.
 */
const MAX_PIXELS = 12_000_000

export interface PagePicture {
  png: Uint8Array
  /** Size in page px (what the page looked like on screen). */
  w: number
  h: number
}

export async function pagePicture(api: InkApi): Promise<PagePicture | null> {
  const { controller, doc } = api
  const hidden = new Set(doc.layers.filter((l) => l.hidden).map((l) => l.id))
  const strokes = doc.all().filter((p) => !hidden.has(p.layerId))
  if (strokes.length === 0) return null
  const wrap = controller.pageElement()
  const box = wrap.getBoundingClientRect()
  const w = Math.max(1, Math.ceil(box.width))
  const h = Math.max(1, Math.ceil(box.height))
  const scale = Math.min(2, Math.sqrt(MAX_PIXELS / (w * h)))
  if (scale < 0.25) return null
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w * scale)
  canvas.height = Math.ceil(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  // The theme's own page colour, so the words (drawn in the theme's text
  // colour) and the ink stay readable in Day, Night and Sepia.
  ctx.fillStyle = getComputedStyle(document.body).backgroundColor || '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  paintBlocks(
    ctx,
    wrap,
    controller.layout.blocks().map((b) => b.id),
    0,
    0,
    scale,
  )
  const target: Target = { ctx, top: 0, dpr: scale }
  for (const p of strokes) {
    paintStroke(target, p.stroke, controller.layout.frame(p.blockId))
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) return null
  return { png: new Uint8Array(await blob.arrayBuffer()), w, h }
}
