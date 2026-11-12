import type { CatalogTool } from '../types'
import { validatePlan } from '../validate'
import { DEFAULT_EFFORT, type Effort } from './effort'

/**
 * Goal → plan (docs/design/ai-tool-framework.md section 5). The planner is a
 * contract, not a model: it builds the prompt, checks the answer, asks for up
 * to 2 repairs, and falls back to a built-in plan. Where the answer comes from
 * (a person pasting it, Claude through the connector, a paid model behind
 * `spendGate`) is given in as `PlanSource`; this file calls nothing itself.
 */

export type PlanDestination =
  | { kind: 'new_notebook'; title: string }
  | { kind: 'notebook'; id: string }
  | { kind: 'page'; id: string }

export interface SourceInfo {
  title: string
  kind?: string
  /** Size in characters. The planner never sees the text itself. */
  chars: number
}

export interface PlannerInput {
  /** Id of the job this plan will become. */
  id: string
  goal: string
  destination: PlanDestination
  effort?: Effort
  sources?: readonly SourceInfo[]
  /** The job's money limit in rupees (the plan records it; ₹0 means free only). */
  maxInr?: number
}

export const MAX_REPAIRS = 2

/** Text from a source is data: wrapped, and a closing marker inside it is defused. */
export function untrusted(text: string): string {
  const safe = text.replace(
    /<\/?\s*untrusted_note_content\s*>/gi,
    '[removed marker]',
  )
  return `<untrusted_note_content>${safe}</untrusted_note_content>`
}

/** The tools a planner may name: this surface only, as compact JSON. */
export function plannerTools(tools: readonly CatalogTool[]) {
  return tools
    .filter((t) => t.surfaces.includes('app'))
    .map((t) => ({
      id: t.id,
      version: t.version,
      use: t.aiDescription,
      inputs: t.inputs,
      outputs: Object.keys(t.outputs.properties ?? {}),
    }))
}

export function buildPlannerPrompt(
  input: PlannerInput,
  tools: readonly CatalogTool[],
  repair?: readonly string[],
): string {
  const sources = (input.sources ?? []).slice(0, 100)
  const lines = [
    'You plan work for a notes app. Answer with ONLY one JSON object (the plan), no other words.',
    'You may use ONLY the tools in the list. You write briefs, not the content itself.',
    `The plan shape: {"version":1,"goal":string,"steps":[{"id":"s1","tool":string,"toolVersion":number,"args":object,"dependsOn":["s1"]?,"optional":boolean?}]}`,
    'A step may use an earlier step’s result as {"$from":"s1.notebookId"}. Step ids are s1, s2, ... in order.',
    `Goal (untrusted text from the person): ${untrusted(input.goal)}`,
    `Where the result goes (fixed, do not change): ${JSON.stringify(input.destination)}`,
    sources.length
      ? `Sources (titles and sizes only): ${untrusted(JSON.stringify(sources))}`
      : '',
    `Tools: ${JSON.stringify(plannerTools(tools))}`,
    repair?.length
      ? `Your last plan had problems. Fix these and answer again:\n${repair.join('\n')}`
      : '',
  ]
  return lines.filter(Boolean).join('\n\n')
}

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec =>
  !!v && typeof v === 'object' && !Array.isArray(v)

/** The answer text as an object: a ```json fence is allowed, and `{plan: ...}`. */
export function parsePlanText(
  text: string,
): { ok: true; value: Rec } | { ok: false; problem: string } {
  let body = text.trim()
  const fence = /^```[A-Za-z]*\s*\n([\s\S]*?)\n?```\s*$/.exec(body)
  if (fence) body = fence[1].trim()
  if (!body) return { ok: false, problem: ':empty' }
  let value: unknown
  try {
    value = JSON.parse(body)
  } catch {
    return { ok: false, problem: ':json' }
  }
  if (isRec(value) && isRec(value.plan) && !('steps' in value))
    value = value.plan
  if (!isRec(value)) return { ok: false, problem: ':object' }
  return { ok: true, value }
}

/**
 * What the app decides, whatever the model said: the id, where the result
 * goes, the effort, the money limit and who made it. The model decides only
 * the goal text and the steps.
 */
export function withAppFields(value: Rec, input: PlannerInput): Rec {
  const base: Rec = {
    version: 1,
    id: input.id,
    goal:
      typeof value.goal === 'string' && value.goal ? value.goal : input.goal,
    origin: 'app',
    destination: input.destination,
    effort: input.effort ?? DEFAULT_EFFORT,
    steps: value.steps,
    budget: { maxInr: input.maxInr ?? 0 },
  }
  return base
}

export type PlanCheck =
  { ok: true; plan: Rec } | { ok: false; errors: string[] }

/** Parses and validates a planner answer. Errors are `path: message` lines. */
export function checkPlanAnswer(
  text: string,
  input: PlannerInput,
  tools: readonly CatalogTool[],
): PlanCheck {
  const parsed = parsePlanText(text)
  if (!parsed.ok) return { ok: false, errors: [parsed.problem] }
  const plan = withAppFields(parsed.value, input)
  const errors = validatePlan(plan, tools).map(
    (e) => `${e.path || '/'}: ${e.message}`,
  )
  return errors.length ? { ok: false, errors } : { ok: true, plan }
}

type Kind = 'cards' | 'tidy' | 'notebook'

/** Which built-in plan is closest to the goal. */
export function closestGoal(goal: string, dest: PlanDestination): Kind {
  const g = goal.toLowerCase()
  if (dest.kind === 'page')
    return /\b(card|cards|flashcard|flashcards|quiz|recall)\b/.test(g)
      ? 'cards'
      : 'tidy'
  return 'notebook'
}

/**
 * The built-in plan used when no model plan fits (section 5, point 4): notebook
 * from sources, tidy a page, or cards from a page. Always valid.
 */
export function templatePlan(input: PlannerInput): Rec {
  const dest = input.destination
  const brief = input.goal.trim().slice(0, 480) || 'Clear notes'
  const kind = closestGoal(input.goal, dest)
  const steps: Rec[] =
    kind === 'cards'
      ? [
          {
            id: 's1',
            tool: 'cards.make_recall',
            toolVersion: 1,
            args: { pageId: (dest as { id: string }).id, count: 10 },
          },
        ]
      : kind === 'tidy'
        ? [
            {
              id: 's1',
              tool: 'pages.refine',
              toolVersion: 1,
              args: { pageId: (dest as { id: string }).id, brief },
            },
          ]
        : dest.kind === 'new_notebook'
          ? [
              {
                id: 's1',
                tool: 'notebooks.create',
                toolVersion: 1,
                args: { title: dest.title },
                placement: { in: '$destination' },
              },
              {
                id: 's2',
                tool: 'pages.write_notes',
                toolVersion: 1,
                args: { notebookId: { $from: 's1.notebookId' }, brief },
                dependsOn: ['s1'],
              },
              {
                id: 's3',
                tool: 'cards.make_recall',
                toolVersion: 1,
                args: { pageId: { $from: 's2.pageId' }, count: 10 },
                dependsOn: ['s2'],
                optional: true,
              },
            ]
          : [
              {
                id: 's1',
                tool: 'pages.write_notes',
                toolVersion: 1,
                args: { notebookId: (dest as { id: string }).id, brief },
              },
              {
                id: 's2',
                tool: 'cards.make_recall',
                toolVersion: 1,
                args: { pageId: { $from: 's1.pageId' }, count: 10 },
                dependsOn: ['s1'],
                optional: true,
              },
            ]
  return withAppFields({ steps, goal: brief }, input)
}

/** Gives the planner's answer for a prompt. `round` is 0, then 1 and 2 for repairs. */
export type PlanSource = (prompt: string, round: number) => Promise<string>

export type FallbackWhy = 'invalid' | 'unavailable'

export type PlannerResult =
  | { ok: true; plan: Rec; fallback: FallbackWhy | null; rounds: number }
  | { ok: false; errors: string[] }

/**
 * Runs the whole contract: ask, check, up to 2 repair rounds, then the
 * built-in plan. A source that throws (offline, refused by `spendGate`) goes
 * straight to the built-in plan; nothing is retried here.
 */
export async function runPlanner(opts: {
  input: PlannerInput
  tools: readonly CatalogTool[]
  source: PlanSource
}): Promise<PlannerResult> {
  const { input, tools, source } = opts
  let errors: string[] = []
  let why: FallbackWhy = 'invalid'
  let rounds = 0
  for (let round = 0; round <= MAX_REPAIRS; round++) {
    let text: string
    try {
      text = await source(
        buildPlannerPrompt(input, tools, round ? errors : undefined),
        round,
      )
    } catch {
      why = 'unavailable'
      break
    }
    rounds = round + 1
    const checked = checkPlanAnswer(text, input, tools)
    if (checked.ok)
      return { ok: true, plan: checked.plan, fallback: null, rounds }
    errors = checked.errors
  }
  const plan = templatePlan(input)
  const bad = validatePlan(plan, tools).map((e) => `${e.path}: ${e.message}`)
  return bad.length
    ? { ok: false, errors: bad }
    : { ok: true, plan, fallback: why, rounds }
}
