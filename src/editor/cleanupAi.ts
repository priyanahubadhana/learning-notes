import type { LearningNotesDB } from '../core/db'
import { AiError, estimateTokens } from '../ai/provider'
import { callAi, type AiConfig } from '../ai/route'
import { ensureLibrary, listPrompts, savePrompt } from '../prompts/libraryDb'
import type { PromptItem } from '../prompts/promptModel'
import { estimateCost, type RunCost } from '../prompts/promptRun'
import { CLEANUP_STARTER, SEEDS } from '../prompts/seedPrompts'
import { t } from '../i18n/t'

/**
 * "Clean up with AI" in the paste chooser: the owner's own key rebuilds the
 * full structure of messy pasted text as Markdown (our block format after the
 * normal Markdown paste), keeps every fact and lists anything it could not
 * place. The instructions are the library prompt "Clean up pasted text"
 * (editable; edits are saved to the library as a new version). Lazy chunk.
 */

/** Most characters of one clean-up (the answer must fit in one reply). */
export const MAX_CLEANUP_CHARS = 24_000
const MAX_ANSWER_TOKENS = 8000

/** The answer format every clean-up gets after the instructions. */
export const CLEANUP_FORMAT =
  'Answer with Markdown only (no code fence around it): # headings, - and 1. lists (nested with two spaces), | pipe | tables, > quotes, ``` code. Keep every fact, number, name and link exactly. If something does not fit anywhere, put it unchanged as a list under a last heading "## Not placed".'

export const composeCleanup = (prompt: string, text: string): string =>
  `${prompt.trim()}\n\n${CLEANUP_FORMAT}\n\nText:\n${text}`

/** The most tokens the answer may use: a little more than the input. */
export const answerTokens = (text: string): number =>
  Math.min(MAX_ANSWER_TOKENS, Math.ceil(estimateTokens(text) * 1.4) + 400)

/** The cost shown before anything is sent. */
export const cleanupCost = (
  config: AiConfig,
  prompt: string,
  text: string,
): RunCost =>
  estimateCost(config, composeCleanup(prompt, text), answerTokens(text))

export interface CleanupPrompt {
  text: string
  /** The saved library row, if the owner has one. */
  item?: PromptItem
}

/** The clean-up instructions: the library row, else the shipped text. */
export async function loadCleanupPrompt(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<CleanupPrompt> {
  const seed = SEEDS.find((s) => s.starterId === CLEANUP_STARTER)!
  try {
    const lib = await ensureLibrary(db, workspaceId)
    const item = (await listPrompts(db, lib)).find(
      (i) => i.starterId === CLEANUP_STARTER,
    )
    return item ? { text: item.text, item } : { text: seed.text }
  } catch {
    return { text: seed.text }
  }
}

/** Saves edited instructions into the library (the old text stays as a version). */
export async function saveCleanupPrompt(
  db: LearningNotesDB,
  workspaceId: string,
  loaded: CleanupPrompt,
  text: string,
): Promise<void> {
  if (text.trim() === '' || text === loaded.text) return
  const lib = await ensureLibrary(db, workspaceId)
  const seed = SEEDS.find((s) => s.starterId === CLEANUP_STARTER)!
  const old = loaded.item
  await savePrompt(db, lib, { ...(old ?? seed), text }, old)
}

/** Runs the clean-up; returns the Markdown. */
export async function runCleanup(
  config: AiConfig,
  prompt: string,
  text: string,
  o: { notebookId?: string; fetchImpl?: typeof fetch } = {},
): Promise<string> {
  if (!text.trim()) throw new AiError(t('ai.noText'))
  if (text.length > MAX_CLEANUP_CHARS) throw new AiError(t('cleanup.tooLong'))
  const r = await callAi(config, {
    prompt: composeCleanup(prompt, text),
    maxTokens: answerTokens(text),
    fetchImpl: o.fetchImpl,
    log: { notebookId: o.notebookId, feature: 'prompt' },
  })
  // A reply wrapped in one code fence is unwrapped.
  const fenced = /^\s*```(?:markdown|md)?\n([\s\S]*?)\n```\s*$/.exec(r.text)
  return (fenced ? fenced[1] : r.text).trim()
}

/** The "Not placed" list the AI added, and the Markdown without it kept whole. */
export function unplacedLines(markdown: string): string[] {
  const m = /^#{1,6}\s*(?:not placed|unplaced)\s*$/im.exec(markdown)
  if (!m) return []
  return markdown
    .slice(m.index + m[0].length)
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '').trim())
    .filter(Boolean)
}

/** Numbers of the original that are missing from the answer (a quick fact check). */
export function missingFigures(original: string, cleaned: string): string[] {
  const figures = (s: string) =>
    new Set(
      s.match(/\d[\d.,]*\d|\d/g)?.map((n) => n.replace(/[.,]$/, '')) ?? [],
    )
  const have = figures(cleaned)
  return [...figures(original)].filter((n) => !have.has(n))
}
