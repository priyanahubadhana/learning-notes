import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import type { AiConfig } from '../ai/aiRun'
import { modelInfo } from '../ai/models'
import { AiError, estimateTokens } from '../ai/provider'
import { callAi } from '../ai/route'
import { t } from '../i18n/t'
import type { PromptItem, SkillPart } from './promptModel'
import {
  MAX_INPUT_TOKENS,
  configFor,
  estimateCost,
  type RunCost,
} from './promptRun'
import {
  answerFormat,
  answerRules,
  parseFactCheck,
  parseSkillAnswer,
  SKILL_FORMAT,
  type SkillResult,
} from './skillFormat'

/**
 * Running a skill: ONE call returns every output as structured data
 * (ln-skill/1). The long input goes first and is cached for Claude, so a
 * second run over the same text (a retry, or another skill) costs far less.
 * Simple skills (only keywords and a summary) use the cheapest model; the
 * optional fact check uses a second model and shows its cost first.
 */

const SIMPLE_PARTS: readonly SkillPart[] = ['keywords', 'summary', 'rows']

/** The text that goes in front of the instructions (cached). */
export const inputPrefix = (input: string): string => `Text:\n${input}\n\n`

/** The instructions: what to make, the exact format, the rules, the skill's own words. */
export function skillInstructions(item: PromptItem): string {
  const parts = item.parts
  return [
    `Turn the text above into study material. ${item.text.trim()}`,
    answerRules(parts),
    `Answer in exactly this format (${SKILL_FORMAT}):`,
    answerFormat(parts),
  ].join('\n\n')
}

/** What a user copies for the paste-in path: the input and the same instructions. */
export const skillCopyText = (item: PromptItem, input: string): string =>
  inputPrefix(input) + skillInstructions(item)

/** The most the answer can be, by what it must hold. */
export function skillMaxTokens(parts: readonly SkillPart[]): number {
  let n = 2500 // title, points, sources
  if (parts.includes('pages')) n += 3500
  if (parts.includes('cards')) n += 2500
  if (parts.includes('summary') || parts.includes('keywords')) n += 400
  return Math.min(n, 10_000)
}

/** Models cheapest first (by the price table). */
export function cheapestFirst(config: AiConfig): AiConfig {
  const price = (model: string) => {
    const m = modelInfo(model)
    return m ? m.price.in + m.price.out : Number.MAX_VALUE
  }
  const candidates = [...config.candidates].sort(
    (a, b) => price(a.model) - price(b.model),
  )
  const head = candidates[0]
  return head ? { ...config, candidates, model: head.model } : config
}

/**
 * The company and model for a skill: its preferred one when "use preferred"
 * is on; else the cheapest for a simple skill; else the default order.
 */
export function skillConfig(config: AiConfig, item: PromptItem): AiConfig {
  if (item.usePreferred && item.provider) return configFor(config, item)
  const simple = item.parts.every((p) => SIMPLE_PARTS.includes(p))
  return simple ? providerOf(cheapestFirst(config)) : config
}

/** `provider` follows the first candidate's model. */
function providerOf(config: AiConfig): AiConfig {
  const m = modelInfo(config.model)
  return m ? { ...config, provider: m.provider } : config
}

/** The cost shown before a skill runs (input + instructions in, the limit out). */
export function skillCost(
  config: AiConfig,
  item: PromptItem,
  input: string,
): RunCost {
  return estimateCost(
    config,
    inputPrefix(input) + skillInstructions(item),
    skillMaxTokens(item.parts),
  )
}

/** Runs a skill; returns the checked result and the raw answer. */
export async function runSkill(
  config: AiConfig,
  item: PromptItem,
  input: string,
  o: {
    fetchImpl?: typeof fetch
    page?: Page
    db?: LearningNotesDB
  } = {},
): Promise<SkillResult> {
  if (!input.trim()) throw new AiError(t('ai.noText'))
  const prefix = inputPrefix(input)
  const prompt = skillInstructions(item)
  if (estimateTokens(prefix + prompt) > MAX_INPUT_TOKENS) {
    throw new AiError(t('ai.tooMuch'))
  }
  const chosen = skillConfig(config, item)
  const r = await callAi(chosen, {
    cachePrefix: prefix,
    prompt,
    maxTokens: skillMaxTokens(item.parts),
    approvedUsd: skillCost(chosen, item, input).usd,
    fetchImpl: o.fetchImpl,
    log: { notebookId: o.page?.notebookId, feature: 'skill' },
    where: o.page && o.db ? { db: o.db, pageId: o.page.id } : undefined,
  })
  return parseSkillAnswer(r.text)
}

// ------------------------------------------------------------- fact check

/**
 * A different model than the main call when there is one (a second opinion),
 * else the cheapest; cheapest first among the others.
 */
export function secondModelConfig(
  config: AiConfig,
  mainModel: string,
): AiConfig {
  const sorted = cheapestFirst(config)
  const others = sorted.candidates.filter((c) => c.model !== mainModel)
  if (others.length === 0) return sorted
  return providerOf({
    ...sorted,
    candidates: others,
    model: others[0].model,
  })
}

export function factCheckPrompt(result: SkillResult): string {
  const sources = result.sources
    .map((s) => `[${s.n}] ${s.title}${s.url ? ` (${s.url})` : ''}`)
    .join('\n')
  const points = result.points
    .map(
      (p, i) =>
        `${i}. ${p.text} (sources: ${p.sources.length ? p.sources.join(', ') : 'none'})`,
    )
    .join('\n')
  return [
    'Check these points against the sources they cite and against what is generally known.',
    'Reply with ONE JSON object only, no code fence: {"checks": [{"i": 0, "verdict": "ok|doubt|wrong", "note": "short reason"}]}.',
    'Give a verdict for every point. "doubt" = not supported or unclear; "wrong" = contradicted. Never invent facts.',
    `Sources:\n${sources || '(none)'}`,
    `Points:\n${points}`,
  ].join('\n\n')
}

export const factCheckMaxTokens = (points: number): number =>
  Math.min(4000, 200 + points * 70)

export function factCheckCost(
  config: AiConfig,
  result: SkillResult,
  mainModel: string,
): RunCost {
  return estimateCost(
    secondModelConfig(config, mainModel),
    factCheckPrompt(result),
    factCheckMaxTokens(result.points.length),
  )
}

/** Points the check doubted or refuted are marked and no longer count as checked. */
export function applyFactCheck(
  result: SkillResult,
  checks: ReturnType<typeof parseFactCheck>,
): SkillResult {
  const points = result.points.map((p) => ({ ...p }))
  for (const c of checks) {
    const p = points[c.index]
    if (!p) continue
    if (c.verdict === 'ok') {
      p.note = c.note || p.note
      continue
    }
    p.flag = c.verdict
    p.checked = false
    p.note = c.note
  }
  return { ...result, points }
}

export async function runFactCheck(
  config: AiConfig,
  result: SkillResult,
  mainModel: string,
  o: { fetchImpl?: typeof fetch; page?: Page; db?: LearningNotesDB } = {},
): Promise<SkillResult> {
  const r = await callAi(secondModelConfig(config, mainModel), {
    prompt: factCheckPrompt(result),
    maxTokens: factCheckMaxTokens(result.points.length),
    approvedUsd: factCheckCost(config, result, mainModel).usd,
    fetchImpl: o.fetchImpl,
    log: { notebookId: o.page?.notebookId, feature: 'factCheck' },
    where: o.page && o.db ? { db: o.db, pageId: o.page.id } : undefined,
  })
  return applyFactCheck(result, parseFactCheck(r.text, result.points.length))
}
