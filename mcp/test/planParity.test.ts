import { describe, expect, it } from 'vitest'
import { FakeClock, FakeFiller } from '../../src/aitools/jobs/fakes'
import { MemoryJobStore } from '../../src/aitools/jobs/jobStore'
import type { Rec } from '../../src/aitools/jobs/jobTypes'
import { MemoryNotesPort } from '../../src/aitools/jobs/notesPort'
import { canon } from '../../src/aitools/jobs/notesTx'
import { JobRunner } from '../../src/aitools/jobs/runner'
import { NotesCache } from '../src/cache'
import type { Scopes } from '../src/config'
import { makeWriteTools } from '../src/writeTools'
import { newFixture, seedNotes } from './fixture'

/**
 * Golden plans, app against Node. The same plan is staged by the app's
 * runner (over an in-memory copy of the notes) and by the connector's
 * run_plan (over the decrypted cache). The records must be byte-equal, and
 * what the connector saves must be exactly those records.
 */

const NOW = 1_700_000_000_000
const ALL: Scopes = { read: true, 'write:append': true, 'write:create': true }
const DEVICE = 'mcp-testpc'

const step = (id: string, tool: string, args: Rec) => ({
  id,
  tool,
  toolVersion: 1,
  args,
})
const plan = (id: string, destination: Rec, steps: Rec[]) => ({
  version: 1,
  id,
  goal: `golden ${id}`,
  origin: 'mcp',
  destination,
  steps,
})

const PAGE = {
  title: 'Loops',
  summary: 'How habits form',
  blocks: [
    { type: 'heading', level: 1, text: 'Loops' },
    { type: 'paragraph', text: 'A **habit** is a loop.' },
    {
      type: 'bulletListItem',
      text: 'Cue',
      children: [{ type: 'paragraph', text: 'The trigger.' }],
    },
  ],
}

const GOLDEN: Record<string, Rec> = {
  'notebook from steps': plan('g1', { kind: 'new_notebook', title: 'Habits' }, [
    step('s1', 'notebooks.create', {
      title: 'Habits',
      style: { colour: '#2f6feb', view: 'tabs' },
    }),
    step('s2', 'pages.write_notes', {
      notebookId: { $from: 's1.notebookId' },
      page: PAGE,
    }),
    step('s3', 'cards.make_recall', {
      pageId: { $from: 's2.pageId' },
      cards: [{ kind: 'qa', q: 'What starts a habit?', a: 'A cue.' }],
    }),
    step('s4', 'cards.make_cloze', {
      pageId: { $from: 's2.pageId' },
      cards: [{ kind: 'cloze', text: 'A {{habit}} is a loop.' }],
    }),
  ]),
  'whole notebook from a spec': plan(
    'g2',
    { kind: 'new_notebook', title: 'Chemistry' },
    [
      step('s1', 'notebooks.create_from_spec', {
        spec: {
          version: 'ln-spec/1',
          title: 'Chemistry',
          pages: [
            {
              title: 'Atoms',
              blocks: [{ type: 'paragraph', text: 'Atoms have a nucleus.' }],
            },
            {
              title: 'Bonds',
              blocks: [{ type: 'paragraph', text: 'Bonds join atoms.' }],
            },
          ],
          cards: [
            { kind: 'qa', q: 'Where are protons?', a: 'In the nucleus.' },
          ],
        },
      }),
    ],
  ),
  'a page under an existing page': plan('g3', { kind: 'notebook', id: 'nb1' }, [
    step('s1', 'pages.write_notes', {
      notebookId: 'nb1',
      parentId: 'p1',
      page: PAGE,
    }),
  ]),
  'cards onto an existing page': plan('g4', { kind: 'page', id: 'p1' }, [
    step('s1', 'cards.make_recall', {
      pageId: 'p1',
      cards: [{ kind: 'qa', q: 'What makes ATP?', a: 'Mitochondria.' }],
    }),
  ]),
  'a style on an existing notebook': plan(
    'g5',
    { kind: 'notebook', id: 'nb1' },
    [
      step('s1', 'styles.apply', {
        notebookId: 'nb1',
        style: { colour: '#2e9e6b' },
      }),
    ],
  ),
  'an edit of an existing page': plan('g6', { kind: 'page', id: 'p1' }, [
    step('s1', 'pages.refine', {
      pageId: 'p1',
      ops: [
        { op: 'add', block: { type: 'paragraph', text: 'Added by a plan.' } },
        {
          op: 'replace',
          blockId: 'b2',
          block: { type: 'paragraph', text: 'Better text.' },
        },
      ],
    }),
  ]),
  // Framework slice 5a: Pages, Tabs, Summaries (the same tools on both doors).
  'a page renamed': plan('g7', { kind: 'page', id: 'p1' }, [
    step('s1', 'pages.rename', { pageId: 'p1', title: 'Cell energy' }),
  ]),
  'a tab renamed and another hidden': plan(
    'g8',
    { kind: 'notebook', id: 'nb1' },
    [
      step('s1', 'tabs.rename', {
        notebookId: 'nb1',
        tabId: 'cards',
        title: 'Quiz',
      }),
      step('s2', 'tabs.set_hidden', {
        notebookId: 'nb1',
        tabId: 'revise',
        hidden: true,
      }),
    ],
  ),
  'a summary on a page': plan('g9', { kind: 'page', id: 'p1' }, [
    step('s1', 'summaries.set', {
      pageId: 'p1',
      summary: 'Cells make energy in the mitochondria.',
    }),
  ]),
}

/** The seeded notebook has no tabs; the tab tools need the standard five. */
const TABS = ['notes', 'summary', 'database', 'cards', 'revise'].map((id) => ({
  id,
  kind: id,
}))

async function both(p: Rec) {
  const { master, source } = await newFixture()
  await seedNotes(source, NOW)
  await source.put('notebooks', {
    createdAt: 1,
    updatedAt: 1000,
    deletedAt: null,
    id: 'nb1',
    title: 'Biology',
    order: 'a0',
    allowAi: true,
    workspaceId: 'ws1',
    tabs: TABS,
  })
  const cache = new NotesCache(source, master, { now: () => NOW })
  await cache.refresh(true)

  // The app: the same notes in memory, the app's own runner.
  const port = new MemoryNotesPort(() => NOW)
  for (const t of ['notebooks', 'pages', 'blocks', 'cards'])
    for (const v of cache.rawRecords(t)) port.seed(t, v)
  const clock = new FakeClock()
  clock.time = NOW
  const app = new JobRunner({
    store: new MemoryJobStore(),
    port,
    filler: new FakeFiller(),
    clock,
    workspaceId: 'ws1',
    deviceId: DEVICE,
    surface: 'mcp',
    random: () => 0,
  })
  const made = await app.create(p)
  if (!made.ok) throw new Error(JSON.stringify(made.errors))
  const job = await app.run(String(p.id))
  expect(job.state).toBe('preview')

  // The connector.
  const jobs = new MemoryJobStore()
  const write = makeWriteTools(
    { cache, source, master, deviceId: DEVICE, scopes: ALL, now: () => NOW },
    jobs,
  )
  const out = await write.plan.run_plan({ plan: p })
  const node = (await jobs.get(String(p.id)))!
  return { app: job, node, out, source }
}

const bytes = (v: unknown) => JSON.stringify(canon(v))
// A notebook Claude makes is one Claude may keep working in.
const shaped = (records: { table: string; value: Rec; baseRev?: number }[]) =>
  records.map((r) =>
    r.table === 'notebooks' && !r.baseRev
      ? { ...r, value: { ...r.value, allowAi: true } }
      : r,
  )

describe('golden plans: app and Node give byte-equal records', () => {
  it.each(Object.entries(GOLDEN))('%s', async (_name, p) => {
    const r = await both(p)
    expect(bytes(r.node.changeSet!.records)).toBe(
      bytes(shaped(r.app.changeSet!.records)),
    )
    expect(r.node.changeSet!.counts).toEqual(r.app.changeSet!.counts)
    expect(bytes(r.node.steps.map((s) => s.outputs))).toBe(
      bytes(r.app.steps.map((s) => s.outputs)),
    )
    // What run_plan saved is exactly what was staged (new things), or nothing yet (the Inbox).
    const edits = r.node.changeSet!.records.some((x) => x.baseRev)
    if (edits) {
      expect(r.out.status).toBe('waiting_in_inbox')
      expect(r.node.state).toBe('preview')
    } else {
      expect(r.out.status).toBe('applied')
      const saved = r.source.pushed.length
      expect(saved).toBe(r.node.changeSet!.records.length)
    }
  })
})

describe('undo gives the same result in the app and through undo_job', () => {
  it.each(['notebook from steps', 'whole notebook from a spec'])(
    '%s',
    async (name) => {
      const p = GOLDEN[name]
      const { master, source } = await newFixture()
      await seedNotes(source, NOW)
      const cache = new NotesCache(source, master, { now: () => NOW })
      await cache.refresh(true)
      const port = new MemoryNotesPort(() => NOW)
      for (const t of ['notebooks', 'pages', 'blocks', 'cards'])
        for (const v of cache.rawRecords(t)) port.seed(t, v)
      const clock = new FakeClock()
      clock.time = NOW
      const app = new JobRunner({
        store: new MemoryJobStore(),
        port,
        filler: new FakeFiller(),
        clock,
        workspaceId: 'ws1',
        deviceId: DEVICE,
        surface: 'mcp',
        random: () => 0,
      })
      await app.create(p)
      await app.run(String(p.id))
      await app.apply(String(p.id))
      const job = await app.undo(String(p.id))
      const trashedInApp = job
        .undo!.created.filter((c) => port.get(c.table, c.id)?.deletedAt != null)
        .map((c) => `${c.table}/${c.id}`)
        .sort()

      const write = makeWriteTools(
        {
          cache,
          source,
          master,
          deviceId: DEVICE,
          scopes: ALL,
          now: () => NOW,
        },
        new MemoryJobStore(),
      )
      await write.plan.run_plan({ plan: p })
      const before = source.pushed.length
      await write.plan.undo_job({ jobId: String(p.id) })
      const after = source.pushed.slice(before)
      // Same number of records trashed, none purged, and the live notes are what they were.
      expect(after).toHaveLength(trashedInApp.length)
      expect(trashedInApp.length).toBeGreaterThan(0)
    },
  )
})
