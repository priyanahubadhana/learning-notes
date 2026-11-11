import type { LearningNotesDB } from '../../core/db'
import type { AiConfig } from '../../ai/route'
import { callAi } from '../../ai/route'
import { estimateTokens, imageTokens, type AiImage } from '../../ai/provider'
import { costOf } from '../../ai/usage'

/**
 * The optional AI reading of scanned pages (Q8). Off by default: the screen
 * shows the cost first, and every call goes through `callAi`, so AI-off, the
 * notebook switch, locked pages and the monthly spending limit all apply.
 * Only the pictures of the pages the person chose are sent.
 */

export const AI_OCR_MAX_TOKENS = 1500

export const AI_OCR_PROMPT =
  'Transcribe all the text in the picture, in reading order, exactly as written. It may be printed or handwritten, in English, Hindi (Devanagari) or another language: keep each word in its own script, do not translate. Keep the line breaks. Answer with the text only: no introduction, no quotes, no code fence. If there is no readable text, answer with an empty line.'

/** Cost in US dollars of reading `pages` pages (a worst-case estimate). */
export function estimateAiOcrCost(config: AiConfig, pages: number): number {
  const input = estimateTokens(AI_OCR_PROMPT) + imageTokens(1240, 1754)
  return pages * costOf(config.provider, config.model, input, AI_OCR_MAX_TOKENS)
}

/** Cleans an answer: no fence, no quotes. */
export function cleanOcrText(text: string): string {
  return text
    .trim()
    .replace(/^```[a-z]*\n?|\n?```$/g, '')
    .trim()
}

export async function aiReadPage(
  config: AiConfig,
  image: AiImage,
  where: { db: LearningNotesDB; pageId: string },
  signal?: AbortSignal,
): Promise<string> {
  const r = await callAi(config, {
    prompt: AI_OCR_PROMPT,
    maxTokens: AI_OCR_MAX_TOKENS,
    images: [image],
    signal,
    log: { feature: 'pdfOcr' },
    where,
  })
  return cleanOcrText(r.text)
}
