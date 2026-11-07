import { addBlocks } from '../core/blockBulk'
import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import type { Page } from '../core/types'
import { importParsed, type ImportResult } from '../capture/importNotes'
import { parseNotes, type ParsedNotes } from '../capture/notesFormat'
import { toPlainText } from '../editor/mapping'
import { markdownToBlocks } from '../editor/textBlocks'
import { t } from '../i18n/t'
import { listAllHighlights } from '../reader/annotations/annotationService'
import { AiError, estimateTokens, type AiResult } from './provider'
import { callAi, type AiConfig } from './route'

export {
  AI_KEYS,
  DEFAULT_CAP_USD,
  forNotebook,
  readAiConfig,
  type AiConfig,
} from './route'

/**
 * The four AI actions (CR4) and the checks around every call: AI is on, the
 * notebook allows it, a key is saved, the monthly cap holds. Only the chosen
 * text is sent. What comes back is ordinary content (the ln-notes/1 format),
 * marked `source: 'ai'` with one batch id, and cards wait for approval.
 */

export type AiAction = 'summary' | 'keyPoints' | 'cardsPage' | 'cardsHighlights'

/** Most characters of one page sent in one call. */
const MAX_SEND_CHARS = 30_000

const MAX_TOKENS: Record<AiAction, number> = {
  summary: 700,
  keyPoints: 700,
  cardsPage: 1600,
  cardsHighlights: 1600,
}

const FORMAT_NOTE =
  'Answer with Markdown only: no introduction, no code fence. Keep every line short. Use only what is in the text.'

/** The prompt for an action over some text. */
export function actionPrompt(action: AiAction, text: string): string {
  const body = `\n\nText:\n${text}`
  switch (action) {
    case 'summary':
      return `Summarise the text below in 4 to 8 short sentences, in the same language as the text. ${FORMAT_NOTE}${body}`
    case 'keyPoints':
      return `Write short keyword notes from the text below, in the same language as the text, in exactly this format (ln-notes/1):\n\n## Key points\n- one idea per line (6 to 12 lines)\n\n${FORMAT_NOTE}${body}`
    default:
      return `Write recall cards from the text below, in the same language as the text, in exactly this format (ln-notes/1):\n\n## Cards\nQ: A question that tests one idea?\nA: The short answer.\nCloze: A sentence with the {{key word}} hidden.\n\n(6 to 15 cards, no numbering). ${FORMAT_NOTE}${body}`
  }
}

/** The words an action sends: the page text, or the page's highlights. */
export async function gatherText(
  db: LearningNotesDB,
  page: Page,
  action: AiAction,
): Promise<string> {
  if (action === 'cardsHighlights') {
    const all = await listAllHighlights(db)
    return all
      .filter((a) => a.pageId === page.id && a.quote)
      .map((a) => `- ${a.quote?.exact}`)
      .join('\n')
      .slice(0, MAX_SEND_CHARS)
  }
  const blocks = await listBlocks(db, page.id)
  return blocks
    .filter((b) => b.source !== 'ai')
    .map((b) => toPlainText(b.content))
    .filter(Boolean)
    .join('\n')
    .slice(0, MAX_SEND_CHARS)
}

/** Why an action cannot start, as a message key; null when it can. */
export function blocker(
  config: AiConfig,
  allowedHere: boolean,
): 'notReady' | 'allowOff' | null {
  if (!config.enabled || config.candidates.length === 0) return 'notReady'
  return allowedHere ? null : 'allowOff'
}

/**
 * One call, with every check. Records the usage. `fetchImpl` is for tests.
 */
export async function runAi(
  config: AiConfig,
  action: AiAction,
  text: string,
  fetchImpl?: typeof fetch,
  notebookId?: string,
): Promise<AiResult> {
  if (!config.enabled || config.candidates.length === 0) {
    throw new AiError(t('ai.notReady'))
  }
  if (!text.trim()) throw new AiError(t('ai.noText'))
  const prompt = actionPrompt(action, text)
  if (estimateTokens(prompt) > 20_000) throw new AiError(t('ai.tooMuch'))
  return callAi(config, {
    prompt,
    maxTokens: MAX_TOKENS[action],
    fetchImpl,
    log: { notebookId, feature: action },
  })
}

// ---- Applying the answer ----

/** Parsed cards of an answer (for the approval list). */
export function parseCards(markdown: string): ParsedNotes['cards'] {
  try {
    return parseNotes(markdown).cards
  } catch {
    return []
  }
}

/** Adds the key points an answer holds to the page (marked AI, one batch). */
export async function applyKeyPoints(
  db: LearningNotesDB,
  workspaceId: string,
  page: Page,
  markdown: string,
): Promise<ImportResult> {
  return importParsed(db, workspaceId, parseNotes(markdown), {
    pageId: page.id,
  })
}

/** Adds the chosen cards to the page (marked AI, one batch, one Undo). */
export async function applyCards(
  db: LearningNotesDB,
  workspaceId: string,
  page: Page,
  chosen: ParsedNotes['cards'],
): Promise<ImportResult> {
  const empty: ParsedNotes = {
    title: '',
    keyPoints: [],
    steps: [],
    mindMap: '',
    cards: [...chosen],
    screenshots: [],
    rest: [],
  }
  return importParsed(db, workspaceId, empty, { pageId: page.id })
}

/** The summary text goes under the page's Summary heading (or at the end). */
export async function applySummary(
  db: LearningNotesDB,
  page: Page,
  markdown: string,
): Promise<{ batchId: string; blocks: number }> {
  const batchId = createId()
  const blocks = await listBlocks(db, page.id)
  const top = blocks.filter((b) => b.parentId === null)
  const label = t('library.section.summary')
  const at = top.findIndex(
    (b) => b.type === 'heading' && toPlainText(b.content) === label,
  )
  const body = markdownToBlocks(markdown)
  if (at >= 0) {
    // After the Summary heading and the empty line under it, if there is one.
    const next = top[at + 1]
    const skip = next && next.type === 'paragraph' && !toPlainText(next.content)
    const made = await addBlocks(db, page.id, body, {
      index: at + 1 + (skip ? 1 : 0),
      source: 'ai',
      batchId,
    })
    return { batchId, blocks: made.length }
  }
  const made = await addBlocks(
    db,
    page.id,
    [
      {
        type: 'heading',
        content: {
          level: 2,
          text: [{ type: 'text', text: label, styles: {} }],
        },
      },
      ...body,
    ],
    { source: 'ai', batchId },
  )
  return { batchId, blocks: made.length }
}
