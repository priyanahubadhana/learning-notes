import { db } from '../core/db'
import type { PadStroke } from '../editor/writePad/pressure'
import { t } from '../i18n/t'
import { aiLockedBlock, blocker, forNotebook, readAiConfig } from './aiRun'
import { AiError, MAX_IMAGE_SIDE, type AiImage } from './provider'
import { getReadPrompt } from './readPrompt'
import { runVision } from './vision'

/**
 * The Write pad's AI engine (Phase P): the strokes are drawn black on white
 * into a PNG (only this picture is sent) and the model reads it. Lazy-loaded
 * when the user taps Read.
 */

const PAD = 16

/** Draws the strokes into a PNG that fits the model's size limit. */
export function strokesToImage(strokes: readonly PadStroke[]): AiImage | null {
  const pts = strokes.flat()
  if (pts.length === 0) return null
  const x0 = Math.min(...pts.map((p) => p.x)) - PAD
  const y0 = Math.min(...pts.map((p) => p.y)) - PAD
  const w = Math.max(...pts.map((p) => p.x)) + PAD - x0
  const h = Math.max(...pts.map((p) => p.y)) + PAD - y0
  const s = Math.min(1, MAX_IMAGE_SIDE / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * s))
  c.height = Math.max(1, Math.round(h * s))
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = '#000000'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke[i - 1]
      const b = stroke[i]
      ctx.lineWidth = Math.max(1.5, 3 * s * (0.5 + b.p))
      ctx.beginPath()
      ctx.moveTo((a.x - x0) * s, (a.y - y0) * s)
      ctx.lineTo((b.x - x0) * s, (b.y - y0) * s)
      ctx.stroke()
    }
    if (stroke.length === 1) {
      const d = stroke[0]
      ctx.fillStyle = '#000000'
      ctx.fillRect((d.x - x0) * s - 1.5, (d.y - y0) * s - 1.5, 3, 3)
    }
  }
  const url = c.toDataURL('image/png')
  return {
    mediaType: 'image/png',
    data: url.slice(url.indexOf(',') + 1),
    width: c.width,
    height: c.height,
  }
}

/** Reads the writing. Throws an AiError with a plain reason. */
export async function readPad(
  strokes: readonly PadStroke[],
  pageId: string | undefined,
): Promise<string> {
  const page = pageId ? await db.pages.get(pageId) : undefined
  const notebook = page ? await db.notebooks.get(page.notebookId) : undefined
  const config = forNotebook(readAiConfig(), notebook)
  const why = blocker(
    config,
    !!notebook?.allowAi,
    pageId ? await aiLockedBlock(db, pageId) : false,
  )
  if (why) {
    throw new AiError(
      t(
        why === 'notReady'
          ? 'ai.convert.needsAi'
          : why === 'lockedOff'
            ? 'ai.lockedOff'
            : 'ai.allowOff',
      ),
    )
  }
  const image = strokesToImage(strokes)
  if (!image) throw new AiError(t('ai.convert.empty'))
  const r = await runVision(
    config,
    'handwriting',
    image,
    undefined,
    undefined,
    pageId ? { db, pageId } : undefined,
    getReadPrompt()?.text,
  )
  if (!r.text.trim()) throw new AiError(t('ai.convert.empty'))
  return r.text
}
