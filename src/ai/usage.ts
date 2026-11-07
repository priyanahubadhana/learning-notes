import { readPref, writePref } from '../app/uiPrefs'
import { modelPrice } from './models'
import {
  estimateTokens,
  imageTokens,
  type AiImage,
  type ProviderId,
} from './provider'

/**
 * What the AI has cost this month, per key (an estimate from token counts and
 * the model table) and the cap of each key. The check runs before every call.
 */

export interface Usage {
  /** "YYYY-MM" of the local calendar. */
  month: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

type Part = Omit<Usage, 'month'>
interface Saved {
  month: string
  keys: Record<string, Part>
}

export const monthKey = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

const isNum = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0
const isPart = (v: unknown): v is Part =>
  !!v &&
  typeof v === 'object' &&
  isNum((v as Part).inputTokens) &&
  isNum((v as Part).outputTokens) &&
  isNum((v as Part).costUsd)
const isSaved = (v: unknown): v is Saved =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as Saved).month === 'string' &&
  !!(v as Saved).keys &&
  typeof (v as Saved).keys === 'object' &&
  Object.values((v as Saved).keys).every(isPart)

const NONE: Part = { inputTokens: 0, outputTokens: 0, costUsd: 0 }

function read(now: Date): Saved {
  const fresh: Saved = { month: monthKey(now), keys: {} }
  const saved = readPref('ai.usageByKey', isSaved, fresh)
  return saved.month === fresh.month ? saved : fresh
}

/** What one key has used this month (zero when a new month has begun). */
export function readKeyUsage(keyId: string, now: Date = new Date()): Usage {
  const s = read(now)
  return { month: s.month, ...(s.keys[keyId] ?? NONE) }
}

/** This month's use over all keys. */
export function readUsage(now: Date = new Date()): Usage {
  const s = read(now)
  const all = Object.values(s.keys)
  return {
    month: s.month,
    inputTokens: all.reduce((n, u) => n + u.inputTokens, 0),
    outputTokens: all.reduce((n, u) => n + u.outputTokens, 0),
    costUsd: all.reduce((n, u) => n + u.costUsd, 0),
  }
}

/** Estimated dollars for some tokens. */
export function costOf(
  provider: ProviderId,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = modelPrice(provider, model)
  return (inputTokens * p.in + outputTokens * p.out) / 1_000_000
}

export function recordUsage(
  keyId: string,
  provider: ProviderId,
  model: string,
  inputTokens: number,
  outputTokens: number,
  now: Date = new Date(),
): Usage {
  const s = read(now)
  const u = s.keys[keyId] ?? NONE
  s.keys[keyId] = {
    inputTokens: u.inputTokens + inputTokens,
    outputTokens: u.outputTokens + outputTokens,
    costUsd: u.costUsd + costOf(provider, model, inputTokens, outputTokens),
  }
  writePref('ai.usageByKey', s)
  return { month: s.month, ...s.keys[keyId] }
}

/**
 * Would this call stay under the monthly cap of this key? Uses the prompt
 * size and the most the answer can be, so the check is on the safe side.
 */
export function withinCap(
  keyId: string,
  provider: ProviderId,
  model: string,
  prompt: string,
  maxTokens: number,
  capUsd: number,
  now: Date = new Date(),
  images: readonly AiImage[] = [],
): boolean {
  const input =
    estimateTokens(prompt) +
    images.reduce((n, i) => n + imageTokens(i.width, i.height), 0)
  const worst = costOf(provider, model, input, maxTokens)
  return readKeyUsage(keyId, now).costUsd + worst <= capUsd
}

export const isCap = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10_000
