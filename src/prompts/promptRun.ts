import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { aiLockedBlock } from '../ai/aiLock'
import { blocker, type AiConfig } from '../ai/aiRun'
import { PROVIDERS, estimateTokens, AiError } from '../ai/provider'
import { listKeys } from '../ai/keyStore'
import { modelInfo } from '../ai/models'
import { callAi } from '../ai/route'
import { costOf } from '../ai/usage'
import { readPref } from '../app/uiPrefs'
import { currentLocale, t } from '../i18n/t'
import type { PromptItem } from './promptModel'

/**
 * Running a plain prompt: which model answers, what it will cost (shown in
 * rupees and tokens BEFORE anything is sent), the checks, the call. Skills
 * use the same pieces (skillRun.ts).
 */

/** The answer format every plain prompt gets (also in the paste-in copy). */
export const ANSWER_FORMAT =
  'Answer with Markdown only: no introduction, no code fence. Keep every line short. Use only what is in the text.'

/** Rupees per US dollar. An estimate for the cost line; change the pref ai.inrPerUsd. */
export const DEFAULT_INR_PER_USD = 90
const isRate = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 10_000
export const inrPerUsd = (): number =>
  readPref('ai.inrPerUsd', isRate, DEFAULT_INR_PER_USD)

/** Most tokens one plain prompt may answer with. */
export const PROMPT_MAX_TOKENS = 2000
/** Most tokens of input one run sends. */
export const MAX_INPUT_TOKENS = 80_000

/** The full text a plain prompt sends (and the paste-in copy shows). */
export function composePrompt(item: PromptItem, input: string): string {
  return `${item.text.trim()}\n\n${ANSWER_FORMAT}\n\nText:\n${input}`
}

/**
 * The prompt's own company and model when "use preferred" is on and a key
 * for that company exists; otherwise the config as it is.
 */
export function configFor(config: AiConfig, item: PromptItem): AiConfig {
  if (!item.usePreferred || !item.provider) return config
  const key = listKeys().find((k) => k.provider === item.provider)
  if (!key) return config
  const model =
    item.model && modelInfo(item.model)?.provider === item.provider
      ? item.model
      : PROVIDERS[item.provider].defaultModel
  return {
    ...config,
    candidates: [{ keyId: key.id, model }],
    provider: item.provider,
    model,
  }
}

export interface RunCost {
  provider: AiConfig['provider']
  model: string
  modelLabel: string
  inputTokens: number
  /** The most the answer can be (the call's limit). */
  outputTokens: number
  usd: number
  inr: number
}

/** What a call of `prompt` (up to `maxTokens` back) costs on the first choice of `config`. */
export function estimateCost(
  config: AiConfig,
  prompt: string,
  maxTokens: number,
): RunCost {
  const inputTokens = estimateTokens(prompt)
  const usd = costOf(config.provider, config.model, inputTokens, maxTokens)
  return {
    provider: config.provider,
    model: config.model,
    modelLabel: modelInfo(config.model)?.label ?? config.model,
    inputTokens,
    outputTokens: maxTokens,
    usd,
    inr: usd * inrPerUsd(),
  }
}

/** "₹0.42" (two decimals; "under ₹0.01" for almost nothing). */
export function formatInr(inr: number): string {
  const f = new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return inr < 0.005
    ? t('prompts.underInr', { amount: f.format(0.01) })
    : f.format(inr)
}

/** The cost line shown before a run. */
export function costLine(c: RunCost): string {
  return t('prompts.cost', {
    inr: formatInr(c.inr),
    input: c.inputTokens,
    output: c.outputTokens,
    model: c.modelLabel,
  })
}

/**
 * Why a run cannot start now, as text; null when it can. The notebook of a
 * page must allow AI and the page must not be locked.
 */
export async function whyNot(
  db: LearningNotesDB,
  config: AiConfig,
  page: Page | undefined,
): Promise<string | null> {
  const notebook = page ? await db.notebooks.get(page.notebookId) : undefined
  const why = blocker(
    config,
    page ? !!notebook?.allowAi : true,
    page ? await aiLockedBlock(db, page.id) : false,
  )
  if (why === 'notReady') return t('ai.notReady')
  if (why === 'allowOff') return t('ai.allowOff')
  if (why === 'lockedOff') return t('ai.lockedOff')
  return null
}

/** Runs a plain prompt over the input; returns the answer text. */
export async function runPrompt(
  config: AiConfig,
  item: PromptItem,
  input: string,
  o: {
    fetchImpl?: typeof fetch
    page?: Page
    db?: LearningNotesDB
  } = {},
): Promise<string> {
  if (!input.trim()) throw new AiError(t('ai.noText'))
  const prompt = composePrompt(item, input)
  if (estimateTokens(prompt) > MAX_INPUT_TOKENS) {
    throw new AiError(t('ai.tooMuch'))
  }
  const r = await callAi(configFor(config, item), {
    prompt,
    maxTokens: PROMPT_MAX_TOKENS,
    fetchImpl: o.fetchImpl,
    log: { notebookId: o.page?.notebookId, feature: 'prompt' },
    where: o.page && o.db ? { db: o.db, pageId: o.page.id } : undefined,
  })
  return r.text
}
