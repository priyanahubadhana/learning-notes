import {
  aiLockedBlock,
  blocker,
  forNotebook,
  readAiConfig,
} from '../../ai/aiRun'
import { AiError, estimateTokens, imageTokens } from '../../ai/provider'
import type { AiConfig } from '../../ai/route'
import { callAi } from '../../ai/route'
import { blobToImage } from '../../ai/vision'
import { costOf } from '../../ai/usage'
import { toCurrency } from '../../ai/costCurrency'
import { costLine, estimateCost } from '../../prompts/promptRun'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'

/**
 * "Rebuild as an editable mind map": NotebookLM gives a mind map only as a
 * picture, so the owner's own AI reads the picture and writes an outline,
 * which becomes our mind map block. Nothing is sent before the cost is shown.
 */

export const REBUILD_PROMPT =
  'This picture is a mind map. Write it as an indented outline and nothing else. The first line is the central topic, written as "- Topic". Every other line starts with "- " and is indented two spaces for each level below its parent. Keep the words of the picture; no extra text before or after.'

const MAX_OUT = 1500

/** The cost line shown before the picture is sent (rupees, tokens, model). */
export function rebuildCostLine(
  config: AiConfig,
  width: number,
  height: number,
) {
  const base = estimateCost(config, REBUILD_PROMPT, MAX_OUT)
  const inputTokens =
    estimateTokens(REBUILD_PROMPT) + imageTokens(width, height)
  const usd = costOf(config.provider, config.model, inputTokens, MAX_OUT)
  return costLine({ ...base, inputTokens, usd, amount: toCurrency(usd) })
}

/** Why the rebuild cannot run now (no key, AI off for the notebook, locked page), or null. */
export async function rebuildBlocker(
  db: LearningNotesDB,
  pageId: string,
): Promise<'notReady' | 'allowOff' | 'lockedOff' | null> {
  const page = await db.pages.get(pageId)
  const notebook = page ? await db.notebooks.get(page.notebookId) : undefined
  return blocker(
    forNotebook(readAiConfig(), notebook),
    !!notebook?.allowAi,
    await aiLockedBlock(db, pageId),
  )
}

export async function rebuildConfig(
  db: LearningNotesDB,
  pageId: string,
): Promise<AiConfig> {
  const page = await db.pages.get(pageId)
  const notebook = page ? await db.notebooks.get(page.notebookId) : undefined
  return forNotebook(readAiConfig(), notebook)
}

/** Sends the picture to the owner's AI and returns the outline it wrote. */
export async function rebuildMindMap(
  db: LearningNotesDB,
  pageId: string,
  picture: Blob,
): Promise<string> {
  const config = await rebuildConfig(db, pageId)
  const image = await blobToImage(picture)
  const result = await callAi(config, {
    prompt: REBUILD_PROMPT,
    maxTokens: MAX_OUT,
    images: [image],
    log: { feature: 'mindMapPicture' },
    where: { db, pageId },
  })
  const text = result.text.replace(/^```\w*\n?|```$/gm, '').trim()
  if (!text) throw new AiError(t('ai.empty'))
  return text
}
