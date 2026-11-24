import type { AiToolDef } from '../types'

/**
 * Effort levels (docs/design/ai-tool-framework.md section 13): who plans and
 * who fills each step. Plain data and pure functions.
 */
export type Effort = 'quick' | 'standard' | 'deep'
export type Level = 'small' | 'middle' | 'top'
export const EFFORTS: readonly Effort[] = ['quick', 'standard', 'deep']
export const DEFAULT_EFFORT: Effort = 'standard'

export const isEffort = (v: unknown): v is Effort =>
  v === 'quick' || v === 'standard' || v === 'deep'

/** The level of the model that plans. */
export function plannerLevel(effort: Effort): Level {
  return effort === 'quick' ? 'small' : effort === 'standard' ? 'middle' : 'top'
}

/** The level that fills one step, from the effort and the tool's own tier. */
export function fillerLevel(effort: Effort, tier: AiToolDef['tier']): Level {
  if (effort === 'quick') return 'small'
  if (effort === 'standard') return tier === 'simple' ? 'small' : 'middle'
  return tier === 'simple' ? 'small' : tier === 'writing' ? 'middle' : 'top'
}

/** Steps without dependencies that may be filled together. */
export function maxParallel(effort: Effort): number {
  return effort === 'deep' ? 3 : 1
}
