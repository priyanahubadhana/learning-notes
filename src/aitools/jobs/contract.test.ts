import { describe, expect, it } from 'vitest'
import { AI_TOOLS } from '../registry'
import type { AiToolDef, Schema } from '../types'
import type { Rec, StagedRecord } from './jobTypes'
import { buildUndo } from './notesTx'
import { stageStep } from './stage'
import {
  CARDS,
  DATABASE,
  PAGE,
  build,
  makeKit,
  outputOf,
  plan,
} from './testKit'

/** Content for a tool whose example only has a brief or a count. */
const CONTENT_ARGS: Record<string, (ids: Ids) => Rec> = {
  'pages.write_notes': () => ({ page: PAGE }),
  'cards.make_recall': () => ({ cards: CARDS }),
  'cards.make_cloze': () => ({
    cards: [{ kind: 'cloze', text: 'A {{habit}} is a loop.' }],
  }),
  'databases.create': () => ({ database: DATABASE }),
  'pages.refine': (ids) => ({
    ops: [
      {
        op: 'replace',
        blockId: ids.block,
        block: { type: 'paragraph', text: 'Better.' },
      },
    ],
  }),
}

interface Ids {
  notebook: string
  page: string
  block: string
}

/** The example ids (nb1, p1, b1) become the ids of a real notebook. */
const swap = (v: unknown, ids: Ids): unknown => {
  if (v === 'nb1') return ids.notebook
  if (v === 'p1') return ids.page
  if (v === 'b1') return ids.block
  if (Array.isArray(v)) return v.map((x) => swap(x, ids))
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, swap(x, ids)]),
    )
  return v
}

async function world() {
  const kit = makeKit()
  const job = await build(kit, plan('world'))
  const ids: Ids = {
    notebook: outputOf(job, 's1', 'notebookId'),
    page: outputOf(job, 's2', 'pageId'),
    block: String(
      (
        await kit.port.list('blocks', { pageId: outputOf(job, 's2', 'pageId') })
      )[0].id,
    ),
  }
  return { kit, ids }
}

function matches(value: unknown, schema: Schema): boolean {
  if (schema.type === 'string') return typeof value === 'string'
  if (schema.type === 'array')
    return (
      Array.isArray(value) &&
      value.every((x) => (schema.items ? matches(x, schema.items) : true))
    )
  return true
}

const TABLES = new Set([
  'notebooks',
  'pages',
  'blocks',
  'cards',
  'databases',
  'dbColumns',
  'dbViews',
])

function argsFor(tool: AiToolDef, example: object, ids: Ids): Rec {
  const args = swap(example, ids) as Rec
  const make = CONTENT_ARGS[tool.id]
  const needs = (tool.inputs.anyOf ?? [])
    .flatMap((b) => b.required ?? [])
    .find((f) => f !== 'brief' && f !== 'count')
  if (make && needs && args[needs] === undefined)
    return { ...args, ...make(ids) }
  return args
}

const stripTimes = (rs: StagedRecord[]) => JSON.stringify(rs)

const NO_WORLD = new Set(['notebooks.create', 'notebooks.create_from_spec'])

describe.each(AI_TOOLS.filter((t) => !NO_WORLD.has(t.id)))(
  'contract: $id',
  (tool) => {
    const env = (kit: Awaited<ReturnType<typeof world>>['kit']) => ({
      jobId: 'contract',
      stepId: 's1',
      now: 1_700_000_100_000,
      workspaceId: 'ws1',
      port: kit.port,
      staged: [] as StagedRecord[],
    })

    it.each(tool.examples.good.map((g, i) => [i, g] as const))(
      'good example %i: staging is repeatable, valid, and undo restores everything',
      async (_i, example) => {
        const { kit, ids } = await world()
        const args = argsFor(tool, example, ids)
        const a = await stageStep(tool, args, env(kit))
        const b = await stageStep(tool, args, env(kit))
        expect(stripTimes(b.records)).toBe(stripTimes(a.records))
        expect(a.outputs).toEqual(b.outputs)

        expect(a.records.length).toBeGreaterThan(0)
        for (const r of a.records) {
          expect(TABLES.has(r.table)).toBe(true)
          expect(r.value.id).toBe(r.id)
          expect(typeof r.value.updatedAt).toBe('number')
          if (r.baseRev) expect(r.before).toBeTruthy()
        }
        const declared = tool.outputs.properties ?? {}
        for (const [k, v] of Object.entries(a.outputs)) {
          expect(declared[k], `output ${k} is declared`).toBeTruthy()
          expect(matches(v, declared[k])).toBe(true)
        }

        const start = kit.port.liveSnapshot()
        const undo = buildUndo('contract', a.records)
        await kit.port.commit('contract', a.records, undo)
        expect(kit.port.liveSnapshot()).not.toBe(start)
        await kit.port.undo('contract', undo)
        expect(kit.port.liveSnapshot()).toBe(start)
      },
    )

    it('limits are sane', () => {
      expect(tool.limits.timeoutMs).toBeGreaterThan(0)
      expect(tool.limits.maxRetries).toBeGreaterThanOrEqual(0)
      expect(tool.limits.maxRetries).toBeLessThanOrEqual(5)
      expect(tool.idempotent).toBe(true)
    })
  },
)

describe('contract: notebooks.create', () => {
  it('stages the same records twice and undo removes the notebook', async () => {
    const kit = makeKit()
    const tool = AI_TOOLS.find((t) => t.id === 'notebooks.create')!
    const env = {
      jobId: 'contract',
      stepId: 's1',
      now: 1_700_000_100_000,
      workspaceId: 'ws1',
      port: kit.port,
      staged: [] as StagedRecord[],
    }
    for (const [i, example] of tool.examples.good.entries()) {
      const e = { ...env, stepId: `s${i + 1}` }
      const a = await stageStep(tool, example as Rec, e)
      const b = await stageStep(tool, example as Rec, e)
      expect(stripTimes(b.records)).toBe(stripTimes(a.records))
      expect(typeof a.outputs.notebookId).toBe('string')
      const undo = buildUndo('contract', a.records)
      await kit.port.commit('contract', a.records, undo)
      expect(kit.port.count('notebooks')).toBe(1)
      await kit.port.undo('contract', undo)
      expect(kit.port.liveSnapshot()).toBe('')
      expect(kit.port.count('notebooks', true)).toBe(i + 1)
      await kit.port.redo('contract', a.records, undo)
      await kit.port.undo('contract', undo)
    }
  })
})

describe('contract: notebooks.create_from_spec', () => {
  const tool = AI_TOOLS.find((t) => t.id === 'notebooks.create_from_spec')!
  const env = (port: ReturnType<typeof makeKit>['port']) => ({
    jobId: 'contract',
    stepId: 's1',
    now: 1_700_000_100_000,
    workspaceId: 'ws1',
    port,
    staged: [] as StagedRecord[],
  })

  it('stages the same records twice; apply then undo restores the start', async () => {
    const kit = makeKit()
    for (const example of tool.examples.good) {
      const a = await stageStep(tool, example as Rec, env(kit.port))
      const b = await stageStep(tool, example as Rec, env(kit.port))
      expect(stripTimes(b.records)).toBe(stripTimes(a.records))
      expect(a.outputs).toEqual(b.outputs)
      for (const r of a.records) {
        expect(TABLES.has(r.table)).toBe(true)
        expect(r.value.id).toBe(r.id)
      }
      const declared = tool.outputs.properties ?? {}
      for (const k of Object.keys(a.outputs)) expect(declared[k]).toBeTruthy()
      const start = kit.port.liveSnapshot()
      const undo = buildUndo('contract', a.records)
      await kit.port.commit('contract', a.records, undo)
      expect(kit.port.count('notebooks')).toBe(1)
      await kit.port.undo('contract', undo)
      expect(kit.port.liveSnapshot()).toBe(start)
    }
  })

  it('a spec the checker refuses fails the step with the exact place', async () => {
    const kit = makeKit()
    await expect(
      stageStep(
        tool,
        { spec: { version: 'ln-spec/1', title: '' } },
        env(kit.port),
      ),
    ).rejects.toMatchObject({ kind: 'validation' })
  })

  it('refuses more than 1,000 records', async () => {
    const kit = makeKit()
    const blocks = Array.from({ length: 200 }, (_, i) => ({
      type: 'paragraph',
      text: 'p' + i,
    }))
    const pages = Array.from({ length: 6 }, (_, i) => ({
      title: 'P' + i,
      blocks,
    }))
    await expect(
      stageStep(
        tool,
        { spec: { version: 'ln-spec/1', title: 'Big', pages } },
        env(kit.port),
      ),
    ).rejects.toMatchObject({ kind: 'too_many' })
  })
})
