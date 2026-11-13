import type { CatalogTool } from '../aitools/types'
import { estimatePlan } from '../aitools/plan/cost'
import {
  check,
  newDraft,
  reduce,
  toPlan,
  type Checked,
  type Destination,
  type Draft,
} from './buildState'

/**
 * Studio (A3): tick what to make, then "Make selected" builds ONE plan of
 * real catalog tool steps (a new notebook first, a page to hold the result,
 * then one step per tile) with one combined cost. Pure: the screen only shows it.
 */

export interface StudioTile {
  id: string
  tool: string
}

/** The tiles, in the order their steps run. */
export const STUDIO_TILES: readonly StudioTile[] = [
  { id: 'notes', tool: 'pages.write_notes' },
  { id: 'map', tool: 'mindmaps.add' },
  { id: 'cards', tool: 'cards.make_recall' },
  { id: 'cloze', tool: 'cards.make_cloze' },
  { id: 'summary', tool: 'summaries.set' },
]

export const toggleTile = (sel: readonly string[], id: string): string[] =>
  sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]

/** The Build draft for the ticked tiles. Notes is the page that holds the others. */
export function studioDraft(
  sel: readonly string[],
  destination: Destination,
): Draft {
  let d = reduce(newDraft(), { type: 'destination', destination })
  const on = STUDIO_TILES.filter((x) => sel.includes(x.id))
  if (on.length && destination.kind !== 'page')
    d = reduce(d, { type: 'add', tool: 'pages.write_notes' })
  for (const x of on)
    if (x.tool !== 'pages.write_notes' || destination.kind === 'page')
      d = reduce(d, { type: 'add', tool: x.tool })
  return d
}

/** The one plan, or null when nothing is ticked or the place is not chosen. */
export function studioPlan(
  sel: readonly string[],
  destination: Destination,
  tools: readonly CatalogTool[],
  id: string,
  opts: { goal?: string; brief: string },
): Record<string, unknown> | null {
  const d = studioDraft(sel, destination)
  const c = check(d, tools)
  if (c.plan || Object.keys(c.steps).length) return null
  return toPlan(d, tools, {
    id,
    goal: opts.goal ?? '',
    defaultBrief: opts.brief,
  })
}

export interface StudioCost {
  checked: Checked
  /** Steps in the plan (the notebook and page steps count). */
  steps: number
  /** What a paid model would cost for the whole plan; paste is free. */
  totalInr: number
  planningInr: number
  perStepInr: number[]
}

export function studioCost(
  d: Draft,
  tools: readonly CatalogTool[],
): StudioCost {
  const checked = check(d, tools)
  const plan = toPlan(d, tools, { id: 'est', goal: '', defaultBrief: 'x' })
  const est = estimatePlan({
    plan: plan as never,
    tools,
  })
  return {
    checked,
    steps: (plan.steps as unknown[]).length,
    totalInr: est.totalInr,
    planningInr: est.planningInr,
    perStepInr: est.steps.map((s) => s.inr),
  }
}
