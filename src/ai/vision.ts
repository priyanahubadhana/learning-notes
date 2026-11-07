import { t } from '../i18n/t'
import type { AiConfig } from './aiRun'
import {
  AiError,
  MAX_IMAGE_SIDE,
  type AiImage,
  type AiResult,
} from './provider'
import { callAi } from './route'

/**
 * Pictures to text (Phase P): handwriting (Lasso › Convert to text, the Write
 * pad's AI engine) and handwritten maths to LaTeX. Only the picture the user
 * chose is sent, with every check of `runAi`.
 */

export type VisionTask = 'handwriting' | 'latex'

const MAX_TOKENS: Record<VisionTask, number> = { handwriting: 800, latex: 400 }

export function visionPrompt(task: VisionTask): string {
  if (task === 'latex') {
    return 'The picture shows handwritten maths. Answer with one LaTeX formula only: no $ signs, no code fence, no words.'
  }
  return 'Transcribe the handwriting in the picture exactly as written. It may be English, Hindi (Devanagari) or both: keep each word in its own script, do not translate. Keep the line breaks. Answer with the text only: no introduction, no quotes, no code fence. If nothing is readable, answer with an empty line.'
}

/** Cleans what came back: no fences, no surrounding quotes or $ signs. */
export function cleanAnswer(task: VisionTask, text: string): string {
  let s = text
    .trim()
    .replace(/^```[a-z]*\n?|\n?```$/g, '')
    .trim()
  if (task === 'latex') s = s.replace(/^\$+|\$+$/g, '').trim()
  else s = s.replace(/^"(.*)"$/s, '$1')
  return s
}

export async function runVision(
  config: AiConfig,
  task: VisionTask,
  image: AiImage,
  fetchImpl?: typeof fetch,
  sleep?: (ms: number) => Promise<void>,
): Promise<AiResult> {
  if (!config.enabled || config.candidates.length === 0) {
    throw new AiError(t('ai.notReady'))
  }
  const result = await callAi(config, {
    prompt: visionPrompt(task),
    maxTokens: MAX_TOKENS[task],
    images: [image],
    fetchImpl,
    sleep,
  })
  return { ...result, text: cleanAnswer(task, result.text) }
}

/** A PNG blob as a picture the providers take (scaled to fit 1568 px). */
export async function blobToImage(blob: Blob): Promise<AiImage> {
  const bitmap = await createImageBitmap(blob)
  const s = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * s))
  const h = Math.max(1, Math.round(bitmap.height * s))
  let out = blob
  if (s < 1) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    c.getContext('2d')?.drawImage(bitmap, 0, 0, w, h)
    out = await new Promise<Blob>((r, j) =>
      c.toBlob((b) => (b ? r(b) : j(new Error('png'))), 'image/png'),
    )
  }
  bitmap.close?.()
  const bytes = new Uint8Array(await out.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return { mediaType: 'image/png', data: btoa(bin), width: w, height: h }
}
