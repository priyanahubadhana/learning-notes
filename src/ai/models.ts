import { PROVIDERS, type ProviderId } from './provider'

/**
 * The one table of models the picker offers: price, speed, picture support
 * and the short pros and cons (texts in i18n/en/late/ai.ts under `ai.m.<slug>.pro|con`).
 * Prices are US dollars per million tokens from the providers' own pricing
 * pages. Update `MODELS_CHECKED` whenever the table is checked again.
 */
export const MODELS_CHECKED = '2026-11-07'

export type CostBadge = 'high' | 'med' | 'low' | 'free'
export type Speed = 'fast' | 'medium' | 'slow'

export interface ModelInfo {
  /** The id sent to the provider. */
  id: string
  /** Short name for text keys. */
  slug: string
  provider: ProviderId
  label: string
  cost: CostBadge
  /** The provider has a free tier for this model (data may be used by them). */
  freeTier?: true
  speed: Speed
  vision: boolean
  price: { in: number; out: number; cached?: number }
  /** Price not read from the provider's own page (shown as "about"). */
  unverified?: true
}

export const MODELS: readonly ModelInfo[] = [
  {
    id: 'claude-haiku-5-5',
    slug: 'haiku',
    provider: 'anthropic',
    label: 'Claude Haiku 5.5',
    cost: 'low',
    speed: 'fast',
    vision: true,
    price: { in: 0.1, out: 0.5 },
  },
  {
    id: 'claude-sonnet-5-5',
    slug: 'sonnet',
    provider: 'anthropic',
    label: 'Claude Sonnet 5.5',
    cost: 'med',
    speed: 'medium',
    vision: true,
    price: { in: 2, out: 10 },
  },
  {
    id: 'claude-opus-5-5',
    slug: 'opus',
    provider: 'anthropic',
    label: 'Claude Opus 5.5',
    cost: 'high',
    speed: 'slow',
    vision: true,
    price: { in: 4, out: 20 },
  },
  {
    id: 'gemini-3.5-flash-lite',
    slug: 'gflite35',
    provider: 'gemini',
    label: 'Gemini 3.5 Flash-Lite',
    cost: 'free',
    freeTier: true,
    speed: 'fast',
    vision: true,
    price: { in: 0.3, out: 2.5 },
  },
  {
    id: 'gemini-3.1-flash-lite',
    slug: 'gflite31',
    provider: 'gemini',
    label: 'Gemini 3.1 Flash-Lite',
    cost: 'free',
    freeTier: true,
    speed: 'fast',
    vision: true,
    price: { in: 0.25, out: 1.5 },
  },
  {
    id: 'gemini-3.6-flash',
    slug: 'gflash36',
    provider: 'gemini',
    label: 'Gemini 3.6 Flash',
    cost: 'free',
    freeTier: true,
    speed: 'medium',
    vision: true,
    price: { in: 0.75, out: 3.75 },
  },
  {
    id: 'gpt-4o-mini',
    slug: 'gpt4omini',
    provider: 'openai',
    label: 'GPT-4o mini',
    cost: 'low',
    speed: 'fast',
    vision: true,
    price: { in: 0.15, out: 0.6 },
    unverified: true,
  },
  {
    id: 'gpt-4.1-mini',
    slug: 'gpt41mini',
    provider: 'openai',
    label: 'GPT-4.1 mini',
    cost: 'low',
    speed: 'fast',
    vision: true,
    price: { in: 0.4, out: 1.6 },
    unverified: true,
  },
]

export const modelInfo = (id: string): ModelInfo | undefined =>
  MODELS.find((m) => m.id === id)

/** Price of a model; an unknown id uses its provider's default price. */
export function modelPrice(
  provider: ProviderId,
  model: string,
): { in: number; out: number; cached?: number } {
  const m = modelInfo(model)
  return m && m.provider === provider ? m.price : PROVIDERS[provider].price
}

/**
 * The picker order: the saved order (unknown ids dropped), then any model
 * not yet in it, in table order. The first is the default; the rest are the
 * fallback order.
 */
export function orderedModels(saved: readonly string[]): ModelInfo[] {
  const seen = new Set<string>()
  const out: ModelInfo[] = []
  for (const id of saved) {
    const m = modelInfo(id)
    if (m && !seen.has(id)) {
      seen.add(id)
      out.push(m)
    }
  }
  for (const m of MODELS) if (!seen.has(m.id)) out.push(m)
  return out
}

/** Moves one item to a new place (clamped). Returns a new list. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  if (from < 0 || from >= next.length) return next
  const [item] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(next.length, to)), 0, item)
  return next
}
