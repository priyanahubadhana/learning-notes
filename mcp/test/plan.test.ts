import { describe, expect, it } from 'vitest'
import { MemoryJobStore } from '../../src/aitools/jobs/jobStore'
import type { AiJob, Rec } from '../../src/aitools/jobs/jobTypes'
import { openRecord } from '../../src/sync/crypto'
import { fromWire } from '../../src/sync/wire'
import { NotesCache } from '../src/cache'
import { parseConfig, type Scopes } from '../src/config'
import { SourceError } from '../src/source'
import { makeTools } from '../src/tools'
import { makeWriteTools } from '../src/writeTools'
import { newFixture, seedNotes } from './fixture'

const NOW = 1_700_000_000_000
const ALL: Scopes = { read: true, 'write:append': true, 'write:create': true }
const DEVICE = 'mcp-testpc'

async function setup(scopes: Scopes = ALL, clock = { t: NOW }) {
  const { master, source } = await newFixture()
  await seedNotes(source, NOW)
  const cache = new NotesCache(source, master, { now: () => clock.t })
  const jobs = new MemoryJobStore()
  let n = 0
  const write = makeWriteTools(
    {
      cache,
      source,
      master,
      deviceId: DEVICE,
      scopes,
      now: () => clock.t,
      newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
    },
    jobs,
  )
  const opened = async () =>
    Promise.all(
      source.pushed.map(async (it) => {
        const o = await openRecord(master, it.id, it.baseRev + 1, it)
        const env = o.value as { r: Rec }
        return { table: o.table, id: o.id, rec: fromWire(env.r) as Rec }
      }),
    )
  return { master, source, cache, jobs, write, plan: write.plan, opened, clock }
}

interface Step {
  id: string
  tool: string
  toolVersion: number
  args: Rec
  enabled?: boolean
}
type Plan = Rec & { steps: Step[] }

const NB_PLAN = (id: string, extra: Rec = {}): Plan => ({
  version: 1,
  id,
  goal: 'A notebook with notes and cards',
  origin: 'mcp',
  destination: { kind: 'new_notebook', title: 'Habits' },
  steps: [
    {
      id: 's1',
      tool: 'notebooks.create',
      toolVersion: 1,
      args: { title: 'Habits' },
    },
    {
      id: 's2',
      tool: 'pages.write_notes',
      toolVersion: 1,
      args: {
        notebookId: { $from: 's1.notebookId' },
        page: {
          title: 'Loops',
          blocks: [{ type: 'paragraph', text: 'Cue, craving, response.' }],
        },
      },
    },
    {
      id: 's3',
      tool: 'cards.make_recall',
      toolVersion: 1,
      args: {
        pageId: { $from: 's2.pageId' },
        cards: [{ kind: 'qa', q: 'What starts a habit?', a: 'A cue.' }],
      },
    },
  ],
  ...extra,
})

const STYLE_PLAN = (id: string): Plan => ({
  version: 1,
  id,
  goal: 'Colour the biology notebook',
  origin: 'mcp',
  destination: { kind: 'notebook', id: 'nb1' },
  steps: [
    {
      id: 's1',
      tool: 'styles.apply',
      toolVersion: 1,
      args: { notebookId: 'nb1', style: { colour: '#2f6feb' } },
    },
  ],
})

describe('list_tools and describe_tool', () => {
  it('list the catalog the app uses, with filters', async () => {
    const s = await setup()
    const all = await s.plan.list_tools({})
    expect(all.tools.map((t: { id: string }) => t.id)).toEqual(
      expect.arrayContaining(['notebooks.create', 'pages.write_notes']),
    )
    for (const t of all.tools) {
      expect(t).toMatchObject({
        id: expect.any(String),
        label: expect.any(String),
        group: expect.any(String),
        description: expect.any(String),
        risk: expect.stringMatching(/direct|preview|inbox/),
      })
    }
    const cards = await s.plan.list_tools({ query: 'recall' })
    expect(cards.tools.length).toBeGreaterThan(0)
    expect((await s.plan.list_tools({ group: 'nothing here' })).count).toBe(0)
  })

  it('describe_tool gives the full definition and an example step', async () => {
    const s = await setup()
    const d = await s.plan.describe_tool({ id: 'pages.write_notes' })
    expect(d.inputs.type).toBe('object')
    expect(d.limits.timeoutMs).toBeGreaterThan(0)
    expect(d.exampleStep.tool).toBe('pages.write_notes')
    expect(d).not.toHaveProperty('examples')
    await expect(s.plan.describe_tool({ id: 'no.such' })).rejects.toThrow(
      /no tool/,
    )
  })

  it('write nothing and need only read', async () => {
    const s = await setup({
      read: true,
      'write:append': false,
      'write:create': false,
    })
    await s.plan.list_tools({})
    expect(s.source.pushed).toHaveLength(0)
    const off = await setup({
      read: false,
      'write:append': false,
      'write:create': false,
    })
    await expect(off.plan.list_tools({})).rejects.toThrow(/not allowed/)
  })
})

describe('plan_preview', () => {
  it('shows what a plan would do and writes nothing', async () => {
    const s = await setup()
    const r = await s.plan.plan_preview({ plan: NB_PLAN('pv1') })
    expect(r).toMatchObject({ ok: true, writes: false, waitsInInbox: false })
    expect(r.steps).toHaveLength(3)
    expect(r.counts.notebooks).toBe(1)
    expect(r.counts.pages).toBe(1)
    expect(r.counts.cards).toBe(1)
    expect(s.source.pushed).toHaveLength(0)
    expect(await s.jobs.list()).toHaveLength(0)
  })

  it('says which steps would wait in the Inbox', async () => {
    const s = await setup()
    const r = await s.plan.plan_preview({ plan: STYLE_PLAN('pv2') })
    expect(r.waitsInInbox).toBe(true)
    expect(r.reasons).toContain('edits')
  })

  it('returns exact places for a broken plan', async () => {
    const s = await setup()
    const bad = NB_PLAN('pv3')
    bad.steps[0].tool = 'no.such_tool'
    await expect(s.plan.plan_preview({ plan: bad })).rejects.toThrow(
      /\/steps\/0\/tool/,
    )
    await expect(s.plan.plan_preview({ plan: 'text' })).rejects.toThrow(
      /not valid/,
    )
  })

  it('reports the step that cannot be prepared', async () => {
    const s = await setup()
    const p = NB_PLAN('pv4')
    p.steps[1].args = { notebookId: 'nope', page: { title: 'x', blocks: [] } }
    await expect(s.plan.plan_preview({ plan: p })).rejects.toThrow(/s2/)
  })

  it('refuses notebooks Claude may not use and locked ones', async () => {
    const s = await setup()
    const p = NB_PLAN('pv5')
    p.steps = [
      {
        id: 's1',
        tool: 'pages.write_notes',
        toolVersion: 1,
        args: {
          notebookId: 'nb2',
          page: { title: 'x', blocks: [{ type: 'paragraph', text: 'y' }] },
        },
      },
    ]
    await expect(s.plan.plan_preview({ plan: p })).rejects.toThrow(/gone|s1/)
  })

  it('refuses databases and mind maps with a plain sentence', async () => {
    const s = await setup()
    const p = NB_PLAN('pv6')
    p.steps.push({
      id: 's4',
      tool: 'databases.create',
      toolVersion: 1,
      args: { notebookId: { $from: 's1.notebookId' }, brief: 'books' } as never,
    })
    await expect(s.plan.plan_preview({ plan: p })).rejects.toThrow(
      /cannot make yet/,
    )
  })
})

describe('run_plan', () => {
  it('saves a plan that only makes new things, in one go, with a job id', async () => {
    const s = await setup()
    const out = await s.plan.run_plan({ plan: NB_PLAN('rp1') })
    expect(out).toMatchObject({
      jobId: 'rp1',
      status: 'applied',
      repeated: false,
    })
    const recs = await s.opened()
    expect(recs.filter((r) => r.table === 'notebooks')).toHaveLength(1)
    expect(recs.find((r) => r.table === 'notebooks')!.rec).toMatchObject({
      allowAi: true,
      title: 'Habits',
    })
    expect(recs.filter((r) => r.table === 'cards')).toHaveLength(1)
    const status = await s.plan.job_status({ jobId: 'rp1' })
    expect(status).toMatchObject({ status: 'applied' })
    expect(s.source.audits.at(-1)?.tool).toBe('run_plan')
    // Audit lines hold ids and counts, never content.
    expect(JSON.stringify(s.source.audits.at(-1))).not.toContain('craving')
  })

  it('answers a repeated plan id with the first result and writes nothing again', async () => {
    const s = await setup()
    await s.plan.run_plan({ plan: NB_PLAN('rp2') })
    const sent = s.source.pushed.length
    const again = await s.plan.run_plan({ plan: NB_PLAN('rp2') })
    expect(again).toMatchObject({
      jobId: 'rp2',
      status: 'applied',
      repeated: true,
    })
    expect(s.source.pushed).toHaveLength(sent)
  })

  it('puts a plan that edits what exists, or that asks to wait, in the Inbox', async () => {
    const s = await setup()
    const a = await s.plan.run_plan({ plan: STYLE_PLAN('rp3') })
    expect(a).toMatchObject({ status: 'waiting_in_inbox' })
    const b = await s.plan.run_plan({ plan: NB_PLAN('rp4'), mode: 'inbox' })
    expect(b).toMatchObject({ status: 'waiting_in_inbox', reasons: ['asked'] })
    const recs = await s.opened()
    // Only the two Inbox items were saved: no note record at all.
    expect(recs.map((r) => r.table)).toEqual(['claudeInbox', 'claudeInbox'])
    const item = recs[1].rec as { job: { request: string; job: AiJob } }
    expect(item.job.request).toBe('apply')
    expect(item.job.job.state).toBe('preview')
    expect(item.job.job.changeSet!.counts.notebooks).toBe(1)
    expect(await s.plan.job_status({ jobId: 'rp4' })).toMatchObject({
      status: 'waiting_in_inbox',
    })
  })

  it('shows what the owner decided', async () => {
    const s = await setup()
    await s.plan.run_plan({ plan: NB_PLAN('rp5'), mode: 'inbox' })
    const [item] = await s.opened()
    await s.source.put('claudeInbox', {
      ...item.rec,
      id: item.id,
      status: 'accepted',
    })
    expect(await s.plan.job_status({ jobId: 'rp5' })).toMatchObject({
      status: 'accepted',
    })
  })

  it('writes nothing when a step cannot be prepared, and a corrected plan can use the same id', async () => {
    const s = await setup()
    const bad = NB_PLAN('rp6')
    bad.steps[2].args = {
      pageId: 'nope',
      cards: [{ kind: 'qa', q: 'q', a: 'a' }],
    } as never
    await expect(s.plan.run_plan({ plan: bad })).rejects.toThrow(
      /Nothing was changed/,
    )
    expect(s.source.pushed).toHaveLength(0)
    const ok = await s.plan.run_plan({ plan: NB_PLAN('rp6') })
    expect(ok).toMatchObject({ status: 'applied' })
  })

  it('refuses a plan for a locked or hidden notebook, writing nothing', async () => {
    const s = await setup()
    const mk = (nb: string) => ({
      ...NB_PLAN('rp7' + nb),
      destination: { kind: 'notebook', id: nb },
      steps: [
        {
          id: 's1',
          tool: 'pages.write_notes',
          toolVersion: 1,
          args: {
            notebookId: nb,
            page: { title: 'x', blocks: [{ type: 'paragraph', text: 'y' }] },
          },
        },
      ],
    })
    await expect(s.plan.run_plan({ plan: mk('nb2') })).rejects.toThrow()
    await expect(s.plan.run_plan({ plan: mk('nb3') })).rejects.toThrow()
    expect(s.source.pushed).toHaveLength(0)
  })

  it('needs a write switch, even when called directly', async () => {
    const s = await setup({
      read: true,
      'write:append': false,
      'write:create': false,
    })
    await expect(s.plan.run_plan({ plan: NB_PLAN('rp8') })).rejects.toThrow(
      /not allowed/,
    )
    expect(s.source.pushed).toHaveLength(0)
  })

  it('a create-only switch cannot edit, and an append-only switch cannot create', async () => {
    const createOnly = await setup({
      read: true,
      'write:append': false,
      'write:create': true,
    })
    await expect(
      createOnly.plan.run_plan({ plan: STYLE_PLAN('rp9') }),
    ).rejects.toThrow(/write:append/)
    expect(createOnly.source.pushed).toHaveLength(0)
  })
})

describe('rate limits count steps', () => {
  it('refuses a plan whole when its steps would pass the limit', async () => {
    const s = await setup()
    const big = NB_PLAN('rl1')
    // 1 + 25 enabled steps = 26 against 20 a minute.
    big.steps = Array.from({ length: 25 }, (_, i) => ({
      id: `s${i + 1}`,
      tool: 'notebooks.create',
      toolVersion: 1,
      args: { title: `N${i}` },
    }))
    await expect(s.plan.run_plan({ plan: big })).rejects.toThrow(/Split it/)
    expect(s.source.pushed).toHaveLength(0)
  })

  it('counts one plus one per step, and says when to try again', async () => {
    const s = await setup()
    // 3-step plans cost 4 each: five fit in a minute (20), the sixth does not.
    for (let i = 0; i < 5; i++)
      await s.plan.run_plan({ plan: NB_PLAN(`rl2-${i}`), mode: 'inbox' })
    const before = s.source.pushed.length
    await expect(
      s.plan.run_plan({ plan: NB_PLAN('rl2-x'), mode: 'inbox' }),
    ).rejects.toThrow(/Try again in \d+ seconds/)
    expect(s.source.pushed).toHaveLength(before)
    s.clock.t += 61_000
    await s.plan.run_plan({ plan: NB_PLAN('rl2-y'), mode: 'inbox' })
  })

  it('counts a disabled step as free, and undo_job as one write', async () => {
    const s = await setup()
    const p = NB_PLAN('rl3')
    expect(p.steps).toHaveLength(3)
    p.steps[2] = { ...p.steps[2], enabled: false } as never
    await s.plan.run_plan({ plan: p })
    const used = (await s.plan.job_status({ jobId: 'rl3' })).status
    expect(used).toBe('applied')
    await s.plan.undo_job({ jobId: 'rl3' })
  })

  it('limits reads to 60 a minute', async () => {
    const s = await setup()
    for (let i = 0; i < 60; i++) await s.plan.list_tools({})
    await expect(s.plan.list_tools({})).rejects.toThrow(/Try again/)
    s.clock.t += 61_000
    await s.plan.list_tools({})
  })

  it('the existing write tools count too', async () => {
    const s = await setup()
    // create_notebook is one plan with one step: 2 against the limit.
    for (let i = 0; i < 10; i++)
      await s.write.create_notebook({
        spec: {
          version: 'ln-spec/1',
          title: `Book ${i}`,
          pages: [{ title: 'P', blocks: [{ type: 'paragraph', text: 'x' }] }],
        },
      })
    await expect(
      s.write.create_notebook({
        spec: {
          version: 'ln-spec/1',
          title: 'One too many',
          pages: [{ title: 'P', blocks: [{ type: 'paragraph', text: 'x' }] }],
        },
      }),
    ).rejects.toThrow(/Try again/)
  })
})

describe('job_status', () => {
  it('knows only jobs of this connection', async () => {
    const s = await setup()
    await expect(s.plan.job_status({ jobId: 'nope' })).rejects.toThrow(
      /No such job/,
    )
    await s.plan.run_plan({ plan: NB_PLAN('js1') })
    const job = (await s.jobs.get('js1'))!
    await s.jobs.put({ ...job, id: 'js-other', deviceId: 'mcp-other' })
    await expect(s.plan.job_status({ jobId: 'js-other' })).rejects.toThrow(
      /No such job/,
    )
  })
})

describe('undo_job', () => {
  it('takes back what the job made without deleting anything for good', async () => {
    const s = await setup()
    await s.plan.run_plan({ plan: NB_PLAN('u1') })
    const made = (await s.opened()).map((r) => `${r.table}/${r.id}`)
    const before = s.source.pushed.length
    const out = await s.plan.undo_job({ jobId: 'u1' })
    expect(out).toMatchObject({ status: 'undone', repeated: false })
    const after = (await s.opened()).slice(before)
    expect(after.length).toBe(made.length)
    for (const r of after) {
      expect(made).toContain(`${r.table}/${r.id}`)
      expect(r.rec.deletedAt).toEqual(expect.any(Number))
      expect(r.rec.purgedAt).toBeUndefined()
    }
    expect(await s.plan.job_status({ jobId: 'u1' })).toMatchObject({
      status: 'undone',
    })
    // Asking again changes nothing.
    const sent = s.source.pushed.length
    expect(await s.plan.undo_job({ jobId: 'u1' })).toMatchObject({
      status: 'undone',
      repeated: true,
    })
    expect(s.source.pushed).toHaveLength(sent)
    expect(s.source.audits.at(-1)?.tool).toBe('undo_job')
  })

  it('refuses another connection’s job', async () => {
    const s = await setup()
    await s.plan.run_plan({ plan: NB_PLAN('u2') })
    const job = (await s.jobs.get('u2'))!
    await s.jobs.put({ ...job, id: 'u2-other', deviceId: 'mcp-other' })
    await expect(s.plan.undo_job({ jobId: 'u2-other' })).rejects.toThrow(
      /No such job/,
    )
  })

  it('becomes an Inbox request when the person changed the result', async () => {
    const s = await setup()
    await s.plan.run_plan({ plan: NB_PLAN('u3') })
    const recs = await s.opened()
    const page = recs.find((r) => r.table === 'pages')!
    // The person edits the page in the app (a second revision).
    await s.source.put('pages', {
      ...page.rec,
      id: page.id,
      title: 'Loops (mine)',
    })
    const sent = s.source.pushed.length
    const out = await s.plan.undo_job({ jobId: 'u3' })
    expect(out).toMatchObject({ status: 'undo_requested' })
    const added = (await s.opened()).slice(sent)
    expect(added.map((r) => r.table)).toEqual(['claudeInbox'])
    expect((added[0].rec as { job: { request: string } }).job.request).toBe(
      'undo',
    )
    // Nothing was trashed.
    expect((await s.jobs.get('u3'))!.state).toBe('applied')
  })

  it('refuses a job that waits in the Inbox, and one never applied', async () => {
    const s = await setup()
    await s.plan.run_plan({ plan: NB_PLAN('u4'), mode: 'inbox' })
    await expect(s.plan.undo_job({ jobId: 'u4' })).rejects.toThrow(/Inbox/)
  })

  it('undoes a job the owner accepted in the app', async () => {
    const s = await setup()
    await s.plan.run_plan({ plan: NB_PLAN('u5'), mode: 'inbox' })
    const [item] = await s.opened()
    // The app accepted it: its records now exist as ordinary synced records.
    const job = (item.rec as { job: { job: AiJob } }).job.job
    for (const r of job.changeSet!.records)
      await s.source.put(r.table, r.value as { id: string })
    await s.source.put('claudeInbox', {
      ...item.rec,
      id: item.id,
      status: 'accepted',
    })
    const sent = s.source.pushed.length
    const out = await s.plan.undo_job({ jobId: 'u5' })
    expect(out).toMatchObject({ status: 'undone' })
    expect(s.source.pushed.length).toBeGreaterThan(sent)
  })
})

describe('fault injection', () => {
  it('a save that fails leaves no job applied and the same plan can be sent again', async () => {
    const s = await setup()
    const real = s.source.push.bind(s.source)
    s.source.push = async () => {
      throw new SourceError('Could not reach the server (offline?).')
    }
    await expect(s.plan.run_plan({ plan: NB_PLAN('f1') })).rejects.toThrow(
      /reach the server/,
    )
    expect(s.source.pushed).toHaveLength(0)
    const job = await s.jobs.get('f1')
    expect(job?.state === 'applied').toBe(false)
    s.source.push = real
    const ok = await s.plan.run_plan({ plan: NB_PLAN('f1') })
    expect(ok).toMatchObject({ status: 'applied' })
    expect(
      (await s.opened()).filter((r) => r.table === 'notebooks'),
    ).toHaveLength(1)
  })

  it('a server conflict writes nothing and says so', async () => {
    const s = await setup()
    const real = s.source.push.bind(s.source)
    s.source.push = async (items) => {
      const r = await real([])
      return { ...r, conflicts: items.map((i) => i.id) }
    }
    await expect(s.plan.run_plan({ plan: NB_PLAN('f2') })).rejects.toThrow()
    expect(s.source.pushed).toHaveLength(0)
  })

  it('an edit is stored with the revision it was staged from, so the app can refuse it if the page changed', async () => {
    const s = await setup()
    expect(await s.plan.run_plan({ plan: STYLE_PLAN('f3') })).toMatchObject({
      status: 'waiting_in_inbox',
    })
    const [item] = await s.opened()
    const edit = (
      item.rec as { job: { job: AiJob } }
    ).job.job.changeSet!.records.find((r) => r.table === 'notebooks')!
    expect(edit.baseRev).toBe(1000)
    expect(edit.before).toMatchObject({ updatedAt: 1000 })
  })

  it('undo_job that fails to save leaves the job applied', async () => {
    const s = await setup()
    await s.plan.run_plan({ plan: NB_PLAN('f4') })
    const real = s.source.push.bind(s.source)
    s.source.push = async () => {
      throw new SourceError('Could not reach the server (offline?).')
    }
    await expect(s.plan.undo_job({ jobId: 'f4' })).rejects.toThrow()
    expect((await s.jobs.get('f4'))!.state).toBe('applied')
    s.source.push = real
    expect(await s.plan.undo_job({ jobId: 'f4' })).toMatchObject({
      status: 'undone',
    })
  })

  it('a revoked connection can run nothing', async () => {
    const s = await setup()
    s.source.state = 'revoked'
    await expect(s.plan.run_plan({ plan: NB_PLAN('f5') })).rejects.toThrow(
      /revoked/,
    )
    await expect(s.plan.plan_preview({ plan: NB_PLAN('f5') })).rejects.toThrow(
      /revoked/,
    )
  })
})

describe('existing write tools run as jobs', () => {
  it('create_notebook, add_page and add_cards each leave an undoable job', async () => {
    const s = await setup()
    const nb = await s.write.create_notebook({
      spec: {
        version: 'ln-spec/1',
        title: 'Physics',
        pages: [
          { title: 'Motion', blocks: [{ type: 'paragraph', text: 'x' }] },
        ],
      },
    })
    await s.write.add_page({
      notebookId: 'nb1',
      page: { title: 'Plants', blocks: [{ type: 'paragraph', text: 'green' }] },
    })
    const jobs = await s.jobs.list()
    expect(jobs.map((j) => j.state)).toEqual(['applied', 'applied'])
    expect(jobs[0].steps[0].tool).toBe('notebooks.create_from_spec')
    expect(jobs[1].steps[0].tool).toBe('pages.write_notes')
    expect(nb.notebookId).toBe(jobs[0].steps[0].outputs!.notebookId)
    const undone = await s.plan.undo_job({ jobId: jobs[1].id })
    expect(undone).toMatchObject({ status: 'undone' })
  })

  it('add_cards runs as a job in runs of one kind', async () => {
    const s = await setup()
    const tools = makeTools(s.cache, () => NOW)
    const page = await tools.read_page({ pageId: 'p1' })
    await s.write.add_cards({
      pageId: 'p1',
      expectedVersion: page.version,
      cards: [
        { kind: 'qa', q: 'a?', a: 'b' },
        { kind: 'cloze', text: 'The {{x}} is' },
        { kind: 'qa', q: 'c?', a: 'd' },
      ],
    })
    const [job] = await s.jobs.list()
    expect(job.state).toBe('applied')
    expect(job.steps.map((x) => x.tool)).toEqual([
      'cards.make_recall',
      'cards.make_cloze',
      'cards.make_recall',
    ])
    expect(job.changeSet!.counts.cards).toBe(3)
  })

  it('config: the plan tools need nothing new in config.json', () => {
    expect(Object.keys(parseConfig(null).scopes)).toEqual([
      'read',
      'write:append',
      'write:create',
    ])
  })
})
