import { describe, expect, it } from 'vitest'
import type { Rec } from './jobTypes'
import {
  DATABASE,
  build,
  makeKit,
  onePlan,
  outputOf,
  plan,
  type Kit,
} from './testKit'

/** The records a job will write, in a fixed order, as plain text for a stored snapshot. */
async function goldenOf(kit: Kit, id: string) {
  const job = (await kit.runner.get(id))!
  const rows = job.changeSet!.records.map(
    (r) =>
      `${r.table} ${r.baseRev ? 'edit' : 'new'} ${JSON.stringify(r.value)}`,
  )
  return { counts: job.changeSet!.counts, records: rows.sort() }
}

const steps = (...s: Rec[]) => s

describe('golden plans (records compared with stored snapshots)', () => {
  it('notebook, notes and recall cards', async () => {
    const kit = makeKit()
    await build(kit, plan('g1'))
    expect(await goldenOf(kit, 'g1')).toMatchSnapshot()
  })

  it('notebook with a database', async () => {
    const kit = makeKit()
    await build(kit, {
      ...onePlan('notebooks.create', { title: 'Reading' }),
      id: 'g2',
      steps: steps(
        {
          id: 's1',
          tool: 'notebooks.create',
          toolVersion: 1,
          args: { title: 'Reading' },
        },
        {
          id: 's2',
          tool: 'databases.create',
          toolVersion: 1,
          args: { notebookId: { $from: 's1.notebookId' }, database: DATABASE },
          dependsOn: ['s1'],
        },
      ),
    })
    expect(await goldenOf(kit, 'g2')).toMatchSnapshot()
  })

  it('cloze cards and a style on a notebook', async () => {
    const kit = makeKit()
    await build(kit, {
      ...onePlan('notebooks.create', { title: 'Anatomy' }),
      id: 'g3',
      steps: steps(
        {
          id: 's1',
          tool: 'notebooks.create',
          toolVersion: 1,
          args: { title: 'Anatomy', style: { colour: '#2e9e6b' } },
        },
        {
          id: 's2',
          tool: 'pages.write_notes',
          toolVersion: 1,
          args: { notebookId: { $from: 's1.notebookId' }, brief: 'Heart' },
          dependsOn: ['s1'],
        },
        {
          id: 's3',
          tool: 'cards.make_cloze',
          toolVersion: 1,
          args: { pageId: { $from: 's2.pageId' }, count: 3 },
          dependsOn: ['s2'],
        },
        {
          id: 's4',
          tool: 'styles.apply',
          toolVersion: 1,
          args: {
            notebookId: { $from: 's1.notebookId' },
            style: { inkBg: 'grid' },
            pageId: { $from: 's2.pageId' },
            tabColour: '#8a5cf6',
          },
          dependsOn: ['s2'],
        },
      ),
    })
    expect(await goldenOf(kit, 'g3')).toMatchSnapshot()
  })

  it('tidy up an existing page', async () => {
    const kit = makeKit()
    const first = await build(kit, plan('g4a'))
    const pageId = outputOf(first, 's2', 'pageId')
    const [block] = await kit.port.list('blocks', { pageId })
    const ops = [
      {
        op: 'replace',
        blockId: String(block.id),
        block: { type: 'paragraph', text: 'Tidied.' },
      },
      {
        op: 'add',
        block: { type: 'quote', text: 'Small steps.' },
      },
    ]
    const runner = kit.restart({ filler: { fill: async () => ({ ops }) } })
    await runner.create({
      ...onePlan('pages.refine', { pageId, brief: 'Tidy' }),
      id: 'g4b',
    })
    await runner.run('g4b')
    await runner.apply('g4b')
    expect(await goldenOf(kit, 'g4b')).toMatchSnapshot()
  })
})
