import { describe, expect, it } from 'vitest'
import type { Rec } from './jobTypes'
import {
  CARDS,
  CONTENT,
  DATABASE,
  PAGE,
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

// ---- Golden plans 5 to 20 (design section 15) ----

/** Run, preview, apply: snapshot the records, then check Undo and Redo. */
async function golden(
  kit: Kit,
  p: Record<string, unknown>,
  runner = kit.runner,
) {
  const id = String(p.id)
  const start = kit.port.liveSnapshot(true)
  const made = await runner.create(p)
  if (!made.ok) throw new Error(JSON.stringify(made.errors))
  const ran = await runner.run(id)
  expect(ran.state).toBe('preview')
  expect(await goldenOf({ ...kit, runner }, id)).toMatchSnapshot()
  expect(kit.port.liveSnapshot(true)).toBe(start)
  const applied = await runner.apply(id)
  expect(applied.outcome).toBe('applied')
  const after = kit.port.liveSnapshot(true)
  expect(after).not.toBe(start)
  await runner.undo(id)
  expect(kit.port.liveSnapshot(true)).toBe(start)
  await runner.redo(id)
  expect(kit.port.liveSnapshot(true)).toBe(after)
  return applied.job
}

/** A notebook with one page, made by the first golden plan. */
async function seeded(kit: Kit) {
  const first = await build(kit, plan('base'))
  return {
    notebookId: outputOf(first, 's1', 'notebookId'),
    pageId: outputOf(first, 's2', 'pageId'),
  }
}

const step = (id: string, tool: string, args: Rec, extra: Rec = {}): Rec => ({
  id,
  tool,
  toolVersion: 1,
  args,
  ...extra,
})

const from = (ref: string) => ({ $from: ref })

const planOf = (
  id: string,
  destination: Rec,
  list: Rec[],
): Record<string, unknown> => ({
  ...onePlan('notebooks.create', { title: 'x' }),
  id,
  destination,
  steps: list,
})

const NEW_NB = { kind: 'new_notebook', title: 'Golden' }

describe('golden plans 5 to 20', () => {
  it('g5 notebook from sources, deep effort', async () => {
    await golden(makeKit(), {
      ...plan('g5'),
      effort: 'deep',
      sources: ['srcA'],
    })
  })

  it('g6 recall cards given in full on an existing page', async () => {
    const kit = makeKit()
    const { pageId } = await seeded(kit)
    await golden(
      kit,
      planOf('g6', { kind: 'page', id: pageId }, [
        step('s1', 'cards.make_recall', { pageId, cards: CARDS }),
      ]),
    )
  })

  it('g7 notes given in full into an existing notebook', async () => {
    const kit = makeKit()
    const { notebookId } = await seeded(kit)
    await golden(
      kit,
      planOf('g7', { kind: 'notebook', id: notebookId }, [
        step('s1', 'pages.write_notes', {
          notebookId,
          page: { title: 'Sleep', blocks: PAGE.blocks.slice(0, 2) },
        }),
      ]),
    )
  })

  it('g8 cloze cards given in full', async () => {
    const kit = makeKit()
    const { pageId } = await seeded(kit)
    await golden(
      kit,
      planOf('g8', { kind: 'page', id: pageId }, [
        step('s1', 'cards.make_cloze', {
          pageId,
          cards: [{ kind: 'cloze', text: 'The {{cue}} starts a loop.' }],
        }),
      ]),
    )
  })

  it('g9 database into an existing notebook', async () => {
    const kit = makeKit()
    const { notebookId } = await seeded(kit)
    await golden(
      kit,
      planOf('g9', { kind: 'notebook', id: notebookId }, [
        step('s1', 'databases.create', { notebookId, database: DATABASE }),
      ]),
    )
  })

  it('g10 style on an existing notebook (an edit, then undo)', async () => {
    const kit = makeKit()
    const { notebookId } = await seeded(kit)
    await golden(
      kit,
      planOf('g10', { kind: 'notebook', id: notebookId }, [
        step('s1', 'styles.apply', {
          notebookId,
          style: { colour: '#2f6feb', view: 'tabs', sheet: 'A4' },
        }),
      ]),
    )
  })

  it('g11 page tidy-up: insert after a block', async () => {
    const kit = makeKit()
    const { pageId } = await seeded(kit)
    const [block] = await kit.port.list('blocks', { pageId })
    const ops = [
      {
        op: 'insert',
        afterBlockId: String(block.id),
        block: { type: 'paragraph', text: 'Added after the first block.' },
      },
    ]
    await golden(
      kit,
      planOf('g11', { kind: 'page', id: pageId }, [
        step('s1', 'pages.refine', { pageId, ops }),
      ]),
    )
  })

  it('g12 page tidy-up from a brief: two replaces and an add', async () => {
    const kit = makeKit()
    const { pageId } = await seeded(kit)
    const blocks = await kit.port.list('blocks', { pageId })
    const ops: Rec[] = blocks.slice(0, 2).map((b, i) => ({
      op: 'replace',
      blockId: String(b.id),
      block: { type: 'paragraph', text: `Rewritten ${i}.` },
    }))
    ops.push({ op: 'add', block: { type: 'quote', text: 'End.' } })
    const runner = kit.restart({ filler: { fill: async () => ({ ops }) } })
    await golden(
      kit,
      planOf('g12', { kind: 'page', id: pageId }, [
        step('s1', 'pages.refine', { pageId, brief: 'Tidy it' }),
      ]),
      runner,
    )
  })

  it('g13 chain: one notebook, two pages, cards on the second', async () => {
    await golden(
      makeKit(),
      planOf('g13', NEW_NB, [
        step('s1', 'notebooks.create', { title: 'Golden' }),
        step(
          's2',
          'pages.write_notes',
          { notebookId: from('s1.notebookId'), brief: 'First' },
          { dependsOn: ['s1'] },
        ),
        step(
          's3',
          'pages.write_notes',
          { notebookId: from('s1.notebookId'), brief: 'Second' },
          { dependsOn: ['s1'] },
        ),
        step(
          's4',
          'cards.make_recall',
          { pageId: from('s3.pageId'), count: 2 },
          { dependsOn: ['s3'] },
        ),
      ]),
    )
  })

  it('g14 chain: recall and cloze cards from the same page', async () => {
    await golden(
      makeKit(),
      planOf('g14', NEW_NB, [
        step('s1', 'notebooks.create', { title: 'Golden' }),
        step(
          's2',
          'pages.write_notes',
          { notebookId: from('s1.notebookId'), brief: 'Notes' },
          { dependsOn: ['s1'] },
        ),
        step(
          's3',
          'cards.make_recall',
          { pageId: from('s2.pageId'), count: 2 },
          { dependsOn: ['s2'] },
        ),
        step(
          's4',
          'cards.make_cloze',
          { pageId: from('s2.pageId'), count: 1 },
          { dependsOn: ['s3'] },
        ),
      ]),
    )
  })

  it('g15 an optional step with unusable content is skipped', async () => {
    const kit = makeKit({
      ...CONTENT,
      'cards.make_recall': () => ({ cards: [{ kind: 'qa', q: 'no answer' }] }),
    })
    const job = await golden(kit, plan('g15'))
    expect(job.steps.find((s) => s.id === 's3')?.state).toBe('skipped')
  })

  it('g16 a switched-off step is left out', async () => {
    const p = plan('g16')
    const list = p.steps as Rec[]
    list[2] = { ...list[2], enabled: false }
    const kit = makeKit()
    await golden(kit, p)
    expect(kit.filler.log.map((r) => r.tool.id)).not.toContain(
      'cards.make_recall',
    )
  })

  it('g17 library destination: a notebook with a database', async () => {
    await golden(
      makeKit(),
      planOf('g17', { kind: 'library' }, [
        step('s1', 'notebooks.create', {
          title: 'Library find',
          summary: 'Kept in the library.',
        }),
        step(
          's2',
          'databases.create',
          { notebookId: from('s1.notebookId'), database: DATABASE },
          { dependsOn: ['s1'] },
        ),
      ]),
    )
  })

  it('g18 page destination: refine, then colour its tab', async () => {
    const kit = makeKit()
    const { notebookId, pageId } = await seeded(kit)
    await golden(
      kit,
      planOf('g18', { kind: 'page', id: pageId }, [
        step('s1', 'pages.refine', {
          pageId,
          ops: [{ op: 'add', block: { type: 'quote', text: 'Keep going.' } }],
        }),
        step(
          's2',
          'styles.apply',
          { notebookId, pageId, tabColour: '#d9822b' },
          { dependsOn: ['s1'] },
        ),
      ]),
    )
  })

  it('g19 new notebook with a summary and a look, notes only', async () => {
    await golden(
      makeKit(),
      planOf('g19', NEW_NB, [
        step('s1', 'notebooks.create', {
          title: 'Golden',
          summary: 'A short summary.',
          style: { colour: '#c2417f', view: 'shelf', pathStyle: 'full' },
        }),
        step(
          's2',
          'pages.write_notes',
          { notebookId: from('s1.notebookId'), brief: 'Notes' },
          { dependsOn: ['s1'] },
        ),
      ]),
    )
  })

  it('g20 every tool in one plan', async () => {
    const kit = makeKit()
    const { pageId } = await seeded(kit)
    await golden(
      kit,
      planOf('g20', NEW_NB, [
        step('s1', 'notebooks.create', { title: 'Everything' }),
        step(
          's2',
          'pages.write_notes',
          { notebookId: from('s1.notebookId'), brief: 'Notes' },
          { dependsOn: ['s1'] },
        ),
        step(
          's3',
          'cards.make_recall',
          { pageId: from('s2.pageId'), count: 2 },
          { dependsOn: ['s2'] },
        ),
        step(
          's4',
          'cards.make_cloze',
          { pageId: from('s2.pageId'), count: 1 },
          { dependsOn: ['s2'] },
        ),
        step(
          's5',
          'databases.create',
          { notebookId: from('s1.notebookId'), database: DATABASE },
          { dependsOn: ['s1'] },
        ),
        step(
          's6',
          'styles.apply',
          { notebookId: from('s1.notebookId'), style: { inkBg: 'dots' } },
          { dependsOn: ['s1'] },
        ),
        step('s7', 'pages.refine', {
          pageId,
          ops: [{ op: 'add', block: { type: 'quote', text: 'Done.' } }],
        }),
      ]),
    )
  })
})
