import type { InkController } from './controller'
import { paintBlocks } from './paintBlocks'
import { paintStroke, type Target } from './render'

/**
 * A picture of the selected ink: the strokes on the page's paper colour,
 * twice the size on screen. (Words under the ink are not part of it.)
 */
const PAD = 12
const SCALE = 2

export async function selectionPng(
  controller: InkController,
  paper: string,
  wrap?: HTMLElement,
): Promise<Blob | null> {
  const box = controller.selectionRect()
  const items = controller.selected()
  if (!box || items.length === 0) return null
  const w = Math.max(1, Math.ceil(box.w + PAD * 2))
  const h = Math.max(1, Math.ceil(box.h + PAD * 2))
  const canvas = document.createElement('canvas')
  canvas.width = w * SCALE
  canvas.height = h * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // Words and pictures of a mixed selection go under the drawings.
  if (wrap && controller.blockSel.length > 0) {
    paintBlocks(ctx, wrap, controller.blockSel, box.x - PAD, box.y - PAD, SCALE)
  }
  const target: Target = { ctx, top: box.y - PAD, dpr: SCALE }
  const shift = { a: 1, b: 0, c: 0, d: 1, e: PAD - box.x, f: 0 }
  for (const p of items) {
    paintStroke(target, p.stroke, controller.layout.frame(p.blockId), shift)
  }
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/** Copies the picture to the clipboard; false if the browser refuses. */
export async function copyPng(blob: Blob): Promise<boolean> {
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return true
  } catch {
    return false
  }
}
