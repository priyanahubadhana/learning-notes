import { modelPrice, type ModelInfo } from '../../ai/models'
import type { CatalogTool } from '../types'
import { EFFORTS, fillerLevel, plannerLevel, type Effort } from './effort'
import { pickPaid, type Preference } from './router'

/**
 * The cost estimator (section 9). Money is worked out in dollars with the
 * model table and shown in rupees. Free engines cost nothing; the estimate is
 * "what a paid model would cost", so the person can see what they are saving.
 */
export const DEFAULT_USD_TO_INR = 90
/** Tokens of the prompt around a step or a plan (instructions + shape). */
export const PROMPT_OVERHEAD_TOKENS = 600
/** `cost.outTokens` is for this many items; `count` scales it. */
export const BASE_COUNT = 10

export const textTokens = (chars: number): number => Math.ceil(chars / 4)

export interface PlanLike {
  effort?: Effort
  steps: readonly {
    id: string
    tool: string
    args: Record<string, unknown>
    enabled?: boolean
  }[]
}

export interface StepEstimate {
  stepId: string
  tool: string
  inTokens: number
  outTokens: number
  model: string | null
  inr: number
}
export interface PlanEstimate {
  effort: Effort
  steps: StepEstimate[]
  planningInr: number
  totalInr: number
}

export function inrFor(
  model: ModelInfo,
  inTokens: number,
  outTokens: number,
  usdToInr = DEFAULT_USD_TO_INR,
): number {
  const p = modelPrice(model.provider, model.id)
  return ((inTokens * p.in + outTokens * p.out) / 1_000_000) * usdToInr
}

export function estimateOutTokens(
  tool: CatalogTool,
  args: Record<string, unknown>,
): number {
  const count =
    typeof args.count === 'number' && args.count > 0 ? args.count : 0
  const scale = count && tool.inputs.properties?.count ? count / BASE_COUNT : 1
  return Math.ceil(tool.cost.outTokens * scale)
}

export interface EstimateOptions {
  plan: PlanLike
  tools: readonly CatalogTool[]
  effort?: Effort
  /** Measured size of the ticked sources; only tools that read sources are charged for it. */
  sourceChars?: number
  pref?: Preference
  models?: readonly ModelInfo[]
  usdToInr?: number
  planningOutTokens?: number
}

/** What the plan would cost on a paid model at this effort. */
export function estimatePlan(opts: EstimateOptions): PlanEstimate {
  const effort = opts.effort ?? opts.plan.effort ?? 'standard'
  const pref = opts.pref ?? 'balanced'
  const rate = opts.usdToInr ?? DEFAULT_USD_TO_INR
  const byId = new Map(opts.tools.map((t) => [t.id, t]))
  const sourceTokens = textTokens(opts.sourceChars ?? 0)
  const steps: StepEstimate[] = []
  for (const s of opts.plan.steps) {
    const tool = byId.get(s.tool)
    if (!tool || s.enabled === false) continue
    if (tool.cost.fill !== 'model') {
      steps.push({
        stepId: s.id,
        tool: s.tool,
        inTokens: 0,
        outTokens: 0,
        model: null,
        inr: 0,
      })
      continue
    }
    const model = pickPaid(fillerLevel(effort, tool.tier), pref, opts.models)
    const inTokens =
      PROMPT_OVERHEAD_TOKENS +
      (tool.permissions.needsSources ? sourceTokens : 0)
    const outTokens = estimateOutTokens(tool, s.args)
    steps.push({
      stepId: s.id,
      tool: s.tool,
      inTokens,
      outTokens,
      model: model?.id ?? null,
      inr: model ? inrFor(model, inTokens, outTokens, rate) : 0,
    })
  }
  const planner = pickPaid(plannerLevel(effort), pref, opts.models)
  const catalogTokens = textTokens(JSON.stringify(opts.tools).length)
  const planningInr = planner
    ? inrFor(
        planner,
        PROMPT_OVERHEAD_TOKENS + catalogTokens,
        opts.planningOutTokens ?? 400 + opts.plan.steps.length * 120,
        rate,
      )
    : 0
  const totalInr = planningInr + steps.reduce((n, s) => n + s.inr, 0)
  return { effort, steps, planningInr, totalInr }
}

/** The estimate at every effort level, for "about ₹X per level". */
export function estimateAllEfforts(
  opts: Omit<EstimateOptions, 'effort'>,
): Record<Effort, PlanEstimate> {
  return Object.fromEntries(
    EFFORTS.map((e) => [e, estimatePlan({ ...opts, effort: e })]),
  ) as Record<Effort, PlanEstimate>
}
