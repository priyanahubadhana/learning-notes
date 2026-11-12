import { onePlan, validPlan } from '../planFixtures'
import { FakeClock, FakeFiller, type FillHandler } from './fakes'
import { MemoryJobStore } from './jobStore'
import type { AiJob, Rec } from './jobTypes'
import { MemoryNotesPort } from './notesPort'
import { JobRunner, type RunnerDeps } from './runner'

/** Test support only. Nothing in the app imports this file. */

export const WS = 'ws1'

export const PAGE = {
  title: 'Habits',
  summary: 'How habits form.',
  blocks: [
    { type: 'heading', level: 1, text: 'Habits' },
    {
      type: 'paragraph',
      text: 'A **habit** is a loop: cue, craving, response, reward.',
    },
    {
      type: 'bulletListItem',
      text: 'Cue',
      children: [{ type: 'paragraph', text: 'The trigger.' }],
    },
  ],
}

export const CARDS = [
  { kind: 'qa', q: 'What starts a habit loop?', a: 'The cue.' },
  { kind: 'qa', q: 'What ends it?', a: 'The reward.' },
]

export const DATABASE = {
  key: 'books',
  title: 'Books',
  columns: [{ name: 'Status', type: 'choice', options: ['To read', 'Done'] }],
  rows: [{ title: 'Atomic Habits', values: { Status: 'Done' } }],
}

/** Good content for every tool that needs a model. */
export const CONTENT: Record<string, FillHandler> = {
  'pages.write_notes': () => ({ page: PAGE }),
  'cards.make_recall': () => ({ cards: CARDS }),
  'cards.make_cloze': () => ({
    cards: [{ kind: 'cloze', text: 'A {{habit}} is a loop.' }],
  }),
  'databases.create': () => ({ database: DATABASE }),
}

export interface Kit {
  store: MemoryJobStore
  port: MemoryNotesPort
  filler: FakeFiller
  clock: FakeClock
  runner: JobRunner
  /** A second runner over the same store and port: "the app restarted". */
  restart(extra?: Partial<RunnerDeps>): JobRunner
}

export function makeKit(
  handlers: Record<string, FillHandler> = CONTENT,
  extra: Partial<RunnerDeps> = {},
): Kit {
  const store = new MemoryJobStore()
  const clock = new FakeClock()
  const port = new MemoryNotesPort(() => clock.now() + 5000)
  const filler = new FakeFiller(handlers)
  const deps: RunnerDeps = {
    store,
    port,
    filler,
    clock,
    workspaceId: WS,
    random: () => 0,
    ...extra,
  }
  return {
    store,
    port,
    filler,
    clock,
    runner: new JobRunner(deps),
    restart: (more = {}) => new JobRunner({ ...deps, ...more }),
  }
}

export const plan = (id: string): Record<string, unknown> => ({
  ...validPlan(),
  id,
})

export { onePlan, validPlan }

/** Creates, runs and applies a plan; returns the applied job. */
export async function build(kit: Kit, p: Record<string, unknown>) {
  const made = await kit.runner.create(p)
  if (!made.ok) throw new Error(JSON.stringify(made.errors))
  const run = await kit.runner.run(String(p.id))
  if (run.state !== 'preview') throw new Error(`stopped in ${run.state}`)
  return (await kit.runner.apply(String(p.id))).job
}

export const outputOf = (job: AiJob, step: string, key: string) =>
  job.steps.find((s) => s.id === step)?.outputs?.[key] as string

export const rec = (v: unknown) => v as Rec
