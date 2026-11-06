import { readPref, writePref } from '../app/uiPrefs'
import { PROVIDERS, estimateTokens, type ProviderId } from './provider'

/**
 * What the AI has cost this month (an estimate from token counts and a small
 * price table) and the cap the user set. The check runs before every call.
 */

export interface Usage {
  /** "YYYY-MM" of the local calendar. */
  month: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export const monthKey = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

const isUsage = (v: unknown): v is Usage =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as Usage).month === 'string' &&
  [
    (v as Usage).inputTokens,
    (v as Usage).outputTokens,
    (v as Usage).costUsd,
  ].every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)

/** This month's usage (zero when a new month has begun). */
export function readUsage(now: Date = new Date()): Usage {
  const fresh: Usage = {
    month: monthKey(now),
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
  }
  const saved = readPref('ai.usage', isUsage, fresh)
  return saved.month === fresh.month ? saved : fresh
}

/** Estimated dollars for some tokens. */
export function costOf(
  provider: ProviderId,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PROVIDERS[provider].price
  return (inputTokens * p.in + outputTokens * p.out) / 1_000_000
}

export function recordUsage(
  provider: ProviderId,
  inputTokens: number,
  outputTokens: number,
  now: Date = new Date(),
): Usage {
  const u = readUsage(now)
  const next: Usage = {
    month: u.month,
    inputTokens: u.inputTokens + inputTokens,
    outputTokens: u.outputTokens + outputTokens,
    costUsd: u.costUsd + costOf(provider, inputTokens, outputTokens),
  }
  writePref('ai.usage', next)
  return next
}

/**
 * Would this call stay under the monthly cap? Uses the prompt size and the
 * most the answer can be, so the check is on the safe side.
 */
export function withinCap(
  provider: ProviderId,
  prompt: string,
  maxTokens: number,
  capUsd: number,
  now: Date = new Date(),
): boolean {
  const worst = costOf(provider, estimateTokens(prompt), maxTokens)
  return readUsage(now).costUsd + worst <= capUsd
}

export const isCap = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10_000
