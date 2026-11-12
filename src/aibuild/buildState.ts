import type { Rec } from '../aitools/jobs/jobTypes'
import type { CatalogTool } from '../aitools/types'

/**
 * The plan being put together on the Build screen (AF-20): a destination and
 * a list of steps the person can add, reorder, untick and remove. Plain data
 * and pure functions, so the screen only shows it. `toPlan` turns it into the
 * plan document the JobRunner checks.
 */

export type Destination =
  | { kind: 'new_notebook'; title: string }
  | { kind: 'notebook'; id: string }
  | { kind: 'page'; id: string; notebookId: string }

export interface DraftStep {
  uid: string
  tool: string
  enabled: boolean
  brief: string
  count: number
  colour: string
}

export interface Draft {
  destination: Destination
  steps: DraftStep[]
  next: number
}

/** Tools that need their own arguments (a title, a tab): a plan from the goal box or Claude carries them; the step picker does not offer them. */
export const NEEDS_OWN_ARGS: ReadonlySet<string> = new Set([
  'pages.rename',
  'tabs.rename',
  'tabs.set_hidden',
])

export const COLOURS = [
  '#2f6feb',
  '#2e9e6b',
  '#d9822b',
  '#c8402f',
  '#8a5cf6',
  '#c2417f',
] as const

export const newDraft = (): Draft => ({
  destination: { kind: 'new_notebook', title: '' },
  steps: [],
  next: 1,
})

export type Action =
  | { type: 'add'; tool: string }
  | { type: 'remove'; uid: string }
  | { type: 'toggle'; uid: string }
  | { type: 'move'; uid: string; by: -1 | 1 }
  | {
      type: 'edit'
      uid: string
      patch: Partial<Pick<DraftStep, 'brief' | 'count' | 'colour'>>
    }
  | { type: 'destination'; destination: Destination }
  | { type: 'reset' }

export function reduce(d: Draft, a: Action): Draft {
  switch (a.type) {
    case 'add':
      return {
        ...d,
        next: d.next + 1,
        steps: [
          ...d.steps,
          {
            uid: `u${d.next}`,
            tool: a.tool,
            enabled: true,
            brief: '',
            count: 10,
            colour: COLOURS[1],
          },
        ],
      }
    case 'remove':
      return { ...d, steps: d.steps.filter((s) => s.uid !== a.uid) }
    case 'toggle':
      return {
        ...d,
        steps: d.steps.map((s) =>
          s.uid === a.uid ? { ...s, enabled: !s.enabled } : s,
        ),
      }
    case 'move': {
      const i = d.steps.findIndex((s) => s.uid === a.uid)
      const j = i + a.by
      if (i < 0 || j < 0 || j >= d.steps.length) return d
      const steps = [...d.steps]
      const moved = steps[i]
      steps[i] = steps[j]
      steps[j] = moved
      return { ...d, steps }
    }
    case 'edit':
      return {
        ...d,
        steps: d.steps.map((s) => (s.uid === a.uid ? { ...s, ...a.patch } : s)),
      }
    case 'destination':
      return { ...d, destination: a.destination }
    case 'reset':
      return newDraft()
  }
}

export type Problem =
  'noTitle' | 'noDestination' | 'empty' | 'needsPage' | 'badCount'

export interface Checked {
  /** Problem with the destination or the whole plan, if any. */
  plan: Problem | null
  /** Problems per step (uid). */
  steps: Record<string, Problem>
}

const needs = (tool: CatalogTool, field: string) =>
  (tool.inputs.required ?? []).includes(field)
const makes = (tool: CatalogTool, field: string) =>
  field in (tool.outputs.properties ?? {})

/**
 * What blocks a run. A step that needs a page must come after a step that
 * makes one (or the destination is a page); an unticked step makes nothing.
 */
export function check(d: Draft, tools: readonly CatalogTool[]): Checked {
  const byId = new Map(tools.map((t) => [t.id, t]))
  const out: Checked = { plan: null, steps: {} }
  const dest = d.destination
  if (dest.kind === 'new_notebook' && !dest.title.trim()) out.plan = 'noTitle'
  else if (dest.kind !== 'new_notebook' && !dest.id) out.plan = 'noDestination'
  const on = d.steps.filter((s) => s.enabled && byId.has(s.tool))
  if (!out.plan && !on.length) out.plan = 'empty'
  let pageMade = dest.kind === 'page'
  for (const s of on) {
    const tool = byId.get(s.tool)!
    if (needs(tool, 'pageId') && !pageMade) out.steps[s.uid] = 'needsPage'
    else if (
      tool.inputs.properties?.count &&
      (!Number.isInteger(s.count) || s.count < 1 || s.count > 200)
    )
      out.steps[s.uid] = 'badCount'
    if (makes(tool, 'pageId')) pageMade = true
  }
  return out
}

export const isReady = (c: Checked) =>
  !c.plan && Object.keys(c.steps).length === 0

export interface PlanOptions {
  id: string
  goal: string
  /** Used for a step with no brief of its own. */
  defaultBrief: string
}

/** The plan document. Unticked steps are left out. Call `check` first. */
export function toPlan(
  d: Draft,
  tools: readonly CatalogTool[],
  opts: PlanOptions,
): Record<string, unknown> {
  const byId = new Map(tools.map((t) => [t.id, t]))
  const dest = d.destination
  const steps: Rec[] = []
  /** Latest step id that makes each output so far. */
  const made: Record<string, string> = {}
  const ref = (field: string): unknown => {
    if (made[field]) return { $from: `${made[field]}.${field}` }
    if (field === 'notebookId')
      return dest.kind === 'notebook'
        ? dest.id
        : dest.kind === 'page'
          ? dest.notebookId
          : undefined
    if (field === 'pageId') return dest.kind === 'page' ? dest.id : undefined
    return undefined
  }
  const push = (tool: CatalogTool, args: Rec) => {
    const id = `s${steps.length + 1}`
    steps.push({ id, tool: tool.id, toolVersion: tool.version, args })
    for (const k of Object.keys(tool.outputs.properties ?? {})) made[k] = id
  }
  if (dest.kind === 'new_notebook') {
    const create = byId.get('notebooks.create')
    if (create) push(create, { title: dest.title.trim() })
  }
  for (const s of d.steps) {
    const tool = byId.get(s.tool)
    if (!tool || !s.enabled) continue
    const args: Rec = {}
    if (needs(tool, 'notebookId')) args.notebookId = ref('notebookId')
    if (needs(tool, 'pageId')) args.pageId = ref('pageId')
    const brief = s.brief.trim()
    if (tool.id === 'styles.apply') args.style = { colour: s.colour }
    else if (tool.inputs.properties?.count) {
      args.count = s.count
      if (brief) args.brief = brief
    } else if (tool.inputs.properties?.brief) {
      args.brief = brief || opts.defaultBrief
    }
    push(tool, args)
  }
  const destination: Rec =
    dest.kind === 'new_notebook'
      ? { kind: 'new_notebook', title: dest.title.trim() }
      : { kind: dest.kind, id: dest.id }
  return {
    version: 1,
    id: opts.id,
    goal: opts.goal.slice(0, 2000) || 'Build',
    origin: 'app',
    destination,
    steps,
  }
}

/** A new job id: letters and digits, unique enough for one device. */
export function newJobId(): string {
  return `job_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}
