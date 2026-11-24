import { MODELS, modelPrice, type ModelInfo } from '../../ai/models'
import type { Level } from './effort'

/**
 * The model router (section 13). Pure: it is given the models a person could
 * use and returns a choice. It never calls anything. Free engines come first;
 * a paid model is only ever a suggestion until `spendGate` lets it run.
 */
export type Preference = 'balanced' | 'best' | 'cheapest' | { exact: string }

export interface FreeEngine {
  kind: 'free'
  /** `paste` = copy the prompt, paste the answer; `connector` = Claude via the connector. */
  id: 'paste' | 'connector'
}
export interface PaidEngine {
  kind: 'paid'
  model: ModelInfo
}
export type EngineChoice = FreeEngine | PaidEngine

export const PASTE_ENGINE: FreeEngine = { kind: 'free', id: 'paste' }
export const CONNECTOR_ENGINE: FreeEngine = { kind: 'free', id: 'connector' }

const LEVELS: readonly Level[] = ['small', 'middle', 'top']

export function levelOf(model: ModelInfo): Level {
  return model.cost === 'high'
    ? 'top'
    : model.cost === 'med'
      ? 'middle'
      : 'small'
}

/** Dollars per million tokens, in plus out: how the router compares prices. */
export const priceOf = (m: ModelInfo): number => {
  const p = modelPrice(m.provider, m.id)
  return p.in + p.out
}

/** The level a preference asks for (Best goes up one, Cheapest is small). */
export function levelFor(level: Level, pref: Preference): Level {
  if (pref === 'cheapest') return 'small'
  if (pref === 'best') return LEVELS[Math.min(LEVELS.indexOf(level) + 1, 2)]
  return level
}

/**
 * The paid model the router would suggest. Same level first, then lower
 * levels; never a higher level (a dearer model always asks first).
 */
export function pickPaid(
  level: Level,
  pref: Preference,
  models: readonly ModelInfo[] = MODELS,
): ModelInfo | null {
  if (typeof pref === 'object')
    return models.find((m) => m.id === pref.exact) ?? null
  const want = LEVELS.indexOf(levelFor(level, pref))
  for (let at = want; at >= 0; at--) {
    const found = models
      .filter((m) => levelOf(m) === LEVELS[at])
      .sort((a, b) => priceOf(a) - priceOf(b))[0]
    if (found) return found
  }
  return null
}

/** Another model of the same level at the same or a lower price. */
export function fallbackFor(
  model: ModelInfo,
  models: readonly ModelInfo[] = MODELS,
): ModelInfo | null {
  return (
    models
      .filter(
        (m) =>
          m.id !== model.id &&
          levelOf(m) === levelOf(model) &&
          priceOf(m) <= priceOf(model),
      )
      .sort((a, b) => priceOf(a) - priceOf(b))[0] ?? null
  )
}

/** The engine that will really run: a free one whenever there is one. */
export function chooseEngine(opts: {
  free: readonly FreeEngine[]
  level: Level
  pref?: Preference
  models?: readonly ModelInfo[]
}): EngineChoice {
  const free = opts.free[0]
  if (free) return free
  const paid = pickPaid(opts.level, opts.pref ?? 'balanced', opts.models)
  // With no free engine and no model there is still the copy-prompt path.
  return paid ? { kind: 'paid', model: paid } : PASTE_ENGINE
}
