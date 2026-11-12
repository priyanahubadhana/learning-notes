import { describe, expect, it } from 'vitest'
import type { Rec } from './jobTypes'
import {
  CONTENT,
  DATABASE,
  MAP_OUTLINE,
  build,
  makeKit,
  onePlan,
  outputOf,
  plan,
  type Kit,
} from './testKit'

/**
 * Framework slices 5b and 5c: Mind maps, Cards (mindmaps.add, mindmaps.set_theme,
 * cards.suspend) and Databases, Styles, Layouts (databases.rename,
 * styles.set_paper, layouts.set_path_style). Golden plans with stored
 * snapshots, then the faults: locks, gone, stale, a bad answer. After each,
 * either fully applied or nothing written, and Undo puts everything back.
 */

const content = { ...CONTENT, 'mindmaps.add': () => ({ outline: MAP_OUTLINE }) }

const step = (id: string, tool: string, args: Rec, extra: Rec = {}): Rec => ({
  id,
  tool,
  toolVersion: 1,
  args,
  ...extra,
})
const planOf = (id: string, destination: Rec, list: Rec[]): Rec => ({
  ...onePlan('notebooks.create', { title: 'x' }),
  id,
  destination,
  steps: list,
})
const from = (ref: string) => ({ $from: ref })

async function seeded(kit: Kit) {
  const first = await build(kit, plan('base'))
  const notebookId = outputOf(first, 's1', 'notebookId')
  const pageId = outputOf(first, 's2', 'pageId')
  const withDb = await build(
    kit,
    planOf('base-db', { kind: 'notebook', id: notebookId }, [
      step('s1', 'databases.create', { notebookId, database: DATABASE }),
      step('s2', 'mindmaps.add', { pageId, outline: MAP_OUTLINE }),
    ]),
  )
  return {
    notebookId,
    pageId,
    databaseId: outputOf(withDb, 's1', 'databaseId'),
    mapBlockId: outputOf(withDb, 's2', 'blockId'),
    cardId: String((await kit.port.list('cards', {}))[0].id),
  }
}

async function golden(kit: Kit, p: Rec) {
  const id = String(p.id)
  const start = kit.port.liveSnapshot(true)
  const made = await kit.runner.create(p)
  if (!made.ok) throw new Error(JSON.stringify(made.errors))
  const ran = await kit.runner.run(id)
  expect(ran.state, JSON.stringify(ran.steps.map((s) => s.error))).toBe(
    'preview',
  )
  const job = (await kit.runner.get(id))!
  expect({
    counts: job.changeSet!.counts,
    records: job
      .changeSet!.records.map(
        (r) =>
          `${r.table} ${r.baseRev ? 'edit' : 'new'} ${JSON.stringify(r.value)}`,
      )
      .sort(),
  }).toMatchSnapshot()
  expect(kit.port.liveSnapshot(true)).toBe(start)
  expect((await kit.runner.apply(id)).outcome).toBe('applied')
  const after = kit.port.liveSnapshot(true)
  expect(after).not.toBe(start)
  await kit.runner.undo(id)
  expect(kit.port.liveSnapshot(true)).toBe(start)
  await kit.runner.redo(id)
  expect(kit.port.liveSnapshot(true)).toBe(after)
}

describe('golden plans, slices 5b and 5c', () => {
  it('g31 a mind map from an outline', async () => {
    const kit = makeKit(content)
    const { pageId } = await seeded(kit)
    await golden(
      kit,
      planOf('g31', { kind: 'page', id: pageId }, [
        step('s1', 'mindmaps.add', { pageId, outline: 'Cells\n  Nucleus' }),
      ]),
    )
  })

  it('g32 a mind map from a brief (model path), then its theme', async () => {
    const kit = makeKit(content)
    const { pageId } = await seeded(kit)
    await golden(
      kit,
      planOf('g32', { kind: 'page', id: pageId }, [
        step('s1', 'mindmaps.add', { pageId, brief: 'The main ideas' }),
        step(
          's2',
          'mindmaps.set_theme',
          { blockId: from('s1.blockId'), theme: 'bold' },
          { dependsOn: ['s1'] },
        ),
      ]),
    )
    expect(kit.filler.log.map((r) => r.tool.id)).toContain('mindmaps.add')
  })

  it('g33 a card set aside', async () => {
    const kit = makeKit(content)
    const { cardId, notebookId } = await seeded(kit)
    await golden(
      kit,
      planOf('g33', { kind: 'notebook', id: notebookId }, [
        step('s1', 'cards.suspend', { cardId, suspended: true }),
      ]),
    )
  })

  it('g34 a database renamed', async () => {
    const kit = makeKit(content)
    const { databaseId, notebookId } = await seeded(kit)
    await golden(
      kit,
      planOf('g34', { kind: 'notebook', id: notebookId }, [
        step('s1', 'databases.rename', { databaseId, title: 'Reading list' }),
      ]),
    )
  })

  it('g35 paper and page path', async () => {
    const kit = makeKit(content)
    const { pageId } = await seeded(kit)
    await golden(
      kit,
      planOf('g35', { kind: 'page', id: pageId }, [
        step('s1', 'styles.set_paper', { pageId, paper: 'grid' }),
        step(
          's2',
          'layouts.set_path_style',
          { pageId, pathStyle: 'full' },
          { dependsOn: ['s1'] },
        ),
      ]),
    )
  })

  it('g36 chain: a new notebook, a page, a map, a card set aside, a database renamed', async () => {
    await golden(
      makeKit(content),
      planOf('g36', { kind: 'new_notebook', title: 'Chain' }, [
        step('s1', 'notebooks.create', { title: 'Chain' }),
        step(
          's2',
          'pages.write_notes',
          { notebookId: from('s1.notebookId'), brief: 'Notes' },
          { dependsOn: ['s1'] },
        ),
        step(
          's3',
          'mindmaps.add',
          { pageId: from('s2.pageId'), outline: 'Chain\n  Link' },
          { dependsOn: ['s2'] },
        ),
        step(
          's4',
          'cards.make_recall',
          { pageId: from('s2.pageId'), count: 3 },
          { dependsOn: ['s2'] },
        ),
        step(
          's5',
          'styles.set_paper',
          { pageId: from('s2.pageId'), paper: 'dots' },
          { dependsOn: ['s2'] },
        ),
        step(
          's6',
          'databases.create',
          { notebookId: from('s1.notebookId'), database: DATABASE },
          { dependsOn: ['s1'] },
        ),
        step(
          's7',
          'databases.rename',
          { databaseId: from('s6.databaseId'), title: 'Shelf' },
          { dependsOn: ['s6'] },
        ),
      ]),
    )
  })

  it('bringing a card back, plain paper and an inherited path remove the fields; a no-change step writes nothing', async () => {
    const kit = makeKit(content)
    const { cardId, pageId } = await seeded(kit)
    await build(
      kit,
      planOf('h1', { kind: 'page', id: pageId }, [
        step('s1', 'cards.suspend', { cardId, suspended: true }),
        step('s2', 'styles.set_paper', { pageId, paper: 'lined' }),
        step('s3', 'layouts.set_path_style', { pageId, pathStyle: 'simple' }),
      ]),
    )
    expect((await kit.port.read('cards', cardId))!.suspendedAt).toBeTruthy()
    expect((await kit.port.read('pages', pageId))!.inkBg).toBe('lined')
    await build(
      kit,
      planOf('h2', { kind: 'page', id: pageId }, [
        step('s1', 'cards.suspend', { cardId, suspended: false }),
        step('s2', 'styles.set_paper', { pageId, paper: 'plain' }),
        step('s3', 'layouts.set_path_style', { pageId, pathStyle: 'inherit' }),
      ]),
    )
    expect((await kit.port.read('cards', cardId))!.suspendedAt).toBeNull()
    const page = (await kit.port.read('pages', pageId))!
    expect('inkBg' in page).toBe(false)
    expect('pathStyle' in page).toBe(false)
    const again = await kit.runner.create(
      planOf('h3', { kind: 'page', id: pageId }, [
        step('s1', 'cards.suspend', { cardId, suspended: false }),
      ]),
    )
    expect(again.ok).toBe(true)
    const ran = await kit.runner.run('h3')
    expect(ran.state).toBe('failed')
    expect(ran.notice).toBe('There was nothing to write.')
  })

  it('a card that is already set aside is left as it is', async () => {
    const kit = makeKit(content)
    const { cardId, pageId } = await seeded(kit)
    await build(
      kit,
      planOf('k1', { kind: 'page', id: pageId }, [
        step('s1', 'cards.suspend', { cardId, suspended: true }),
      ]),
    )
    const before = (await kit.port.read('cards', cardId))!.suspendedAt
    await kit.runner.create(
      planOf('k2', { kind: 'page', id: pageId }, [
        step('s1', 'cards.suspend', { cardId, suspended: true }),
      ]),
    )
    expect((await kit.runner.run('k2')).state).toBe('failed')
    expect((await kit.port.read('cards', cardId))!.suspendedAt).toBe(before)
  })
})

describe('faults, slices 5b and 5c: nothing is written', () => {
  async function refused(p: Rec, kit: Kit, sentence: string): Promise<void> {
    const start = kit.port.liveSnapshot(true)
    expect((await kit.runner.create(p)).ok).toBe(true)
    const job = await kit.runner.run(String(p.id))
    expect(job.state).toBe('needs_attention')
    expect(job.steps.find((s) => s.state === 'failed')?.error).toBe(sentence)
    expect(kit.port.liveSnapshot(true)).toBe(start)
  }

  async function lock(
    kit: Kit,
    table: string,
    id: string,
    flag: Record<string, unknown>,
  ) {
    const row = (await kit.port.read(table, id))!
    await kit.port.commit(`lock-${id}-${Object.keys(flag)[0]}`, [
      {
        table,
        id,
        value: { ...row, ...flag, updatedAt: Number(row.updatedAt) + 1 },
        baseRev: Number(row.updatedAt),
        before: {
          ...Object.fromEntries(Object.keys(flag).map((k) => [k, undefined])),
          updatedAt: row.updatedAt,
        },
      },
    ])
  }

  it('things that are not there', async () => {
    const kit = makeKit(content)
    const { pageId } = await seeded(kit)
    const dest = { kind: 'page', id: pageId }
    await refused(
      planOf('f1', dest, [
        step('s1', 'cards.suspend', { cardId: 'nope', suspended: true }),
      ]),
      kit,
      'The card is gone.',
    )
    await refused(
      planOf('f2', dest, [
        step('s1', 'databases.rename', { databaseId: 'nope', title: 'X' }),
      ]),
      kit,
      'The database is gone.',
    )
    await refused(
      planOf('f3', dest, [
        step('s1', 'mindmaps.set_theme', { blockId: 'nope', theme: 'bold' }),
      ]),
      kit,
      'The block is gone.',
    )
    await refused(
      planOf('f4', { kind: 'page', id: 'missing' }, [
        step('s1', 'mindmaps.add', { pageId: 'missing', outline: 'A' }),
      ]),
      kit,
      'The page is gone.',
    )
    await refused(
      planOf('f5', { kind: 'page', id: 'missing' }, [
        step('s1', 'styles.set_paper', { pageId: 'missing', paper: 'grid' }),
      ]),
      kit,
      'The page is gone.',
    )
  })

  it('a block that is not a mind map', async () => {
    const kit = makeKit(content)
    const { pageId } = await seeded(kit)
    const blocks = await kit.port.list('blocks', { pageId })
    const plain = blocks.find((b) => b.type !== 'mindMap')!
    await refused(
      planOf('f6', { kind: 'page', id: pageId }, [
        step('s1', 'mindmaps.set_theme', {
          blockId: String(plain.id),
          theme: 'bold',
        }),
      ]),
      kit,
      'This block is not a mind map.',
    )
  })

  it('a blank outline is refused', async () => {
    const kit = makeKit(content)
    const { pageId } = await seeded(kit)
    await refused(
      planOf('f7', { kind: 'page', id: pageId }, [
        step('s1', 'mindmaps.add', { pageId, outline: '   ' }),
      ]),
      kit,
      'The outline is missing.',
    )
  })

  it('the Study tracker is never renamed', async () => {
    const kit = makeKit(content)
    const { databaseId, notebookId } = await seeded(kit)
    const db = (await kit.port.read('databases', databaseId))!
    await kit.port.commit('tracker', [
      {
        table: 'databases',
        id: databaseId,
        value: { ...db, kind: 'studyTracker', updatedAt: 99_999_999_999_999 },
        baseRev: Number(db.updatedAt),
        before: { kind: undefined, updatedAt: db.updatedAt },
      },
    ])
    await refused(
      planOf('f8', { kind: 'notebook', id: notebookId }, [
        step('s1', 'databases.rename', { databaseId, title: 'X' }),
      ]),
      kit,
      'The Study tracker cannot be renamed.',
    )
  })

  it('locked databases, pages and notebooks are never changed by AI', async () => {
    const kit = makeKit(content)
    const { databaseId, notebookId, pageId, cardId, mapBlockId } =
      await seeded(kit)
    await lock(kit, 'databases', databaseId, { locked: true })
    await refused(
      planOf('f9', { kind: 'notebook', id: notebookId }, [
        step('s1', 'databases.rename', { databaseId, title: 'X' }),
      ]),
      kit,
      'This database is locked.',
    )
    await lock(kit, 'pages', pageId, { editLocked: true })
    const dest = { kind: 'page', id: pageId }
    await refused(
      planOf('f10', dest, [
        step('s1', 'mindmaps.add', { pageId, outline: 'A' }),
      ]),
      kit,
      'This page is locked.',
    )
    await refused(
      planOf('f11', dest, [
        step('s1', 'mindmaps.set_theme', {
          blockId: mapBlockId,
          theme: 'paper',
        }),
      ]),
      kit,
      'This page is locked.',
    )
    await refused(
      planOf('f12', dest, [
        step('s1', 'styles.set_paper', { pageId, paper: 'grid' }),
      ]),
      kit,
      'This page is locked.',
    )
    await refused(
      planOf('f13', dest, [
        step('s1', 'layouts.set_path_style', { pageId, pathStyle: 'full' }),
      ]),
      kit,
      'This page is locked.',
    )
    await refused(
      planOf('f14', dest, [
        step('s1', 'cards.suspend', { cardId, suspended: true }),
      ]),
      kit,
      'This page is locked.',
    )
    await lock(kit, 'notebooks', notebookId, { editLocked: true })
    await refused(
      planOf('f15', { kind: 'notebook', id: notebookId }, [
        step('s1', 'cards.suspend', { cardId, suspended: true }),
      ]),
      kit,
      'This notebook is locked.',
    )
  })

  it('a bad mind map answer is repaired once, then the step fails and nothing is written', async () => {
    const kit = makeKit({
      ...content,
      'mindmaps.add': () => ({ outline: '' }),
    })
    const { pageId } = await seeded(kit)
    const start = kit.port.liveSnapshot(true)
    await kit.runner.create(
      planOf('f16', { kind: 'page', id: pageId }, [
        step('s1', 'mindmaps.add', { pageId, brief: 'Short' }),
      ]),
    )
    const job = await kit.runner.run('f16')
    expect(job.state).toBe('needs_attention')
    expect(kit.port.liveSnapshot(true)).toBe(start)
  })

  it('the page changed since it was read: a stale mind map is refused', async () => {
    const kit = makeKit(content)
    const { pageId } = await seeded(kit)
    await refused(
      planOf('f17', { kind: 'page', id: pageId }, [
        step('s1', 'mindmaps.add', {
          pageId,
          outline: 'A',
          baseRevision: '1',
        }),
      ]),
      kit,
      'The page changed since it was read.',
    )
  })

  it('the card changed after staging: Apply writes nothing and says why', async () => {
    const kit = makeKit(content)
    const { cardId, pageId } = await seeded(kit)
    await kit.runner.create(
      planOf('f18', { kind: 'page', id: pageId }, [
        step('s1', 'cards.suspend', { cardId, suspended: true }),
      ]),
    )
    expect((await kit.runner.run('f18')).state).toBe('preview')
    const card = (await kit.port.read('cards', cardId))!
    await kit.port.commit('other', [
      {
        table: 'cards',
        id: cardId,
        value: { ...card, reps: 5, updatedAt: Number(card.updatedAt) + 9 },
        baseRev: Number(card.updatedAt),
        before: { reps: card.reps, updatedAt: card.updatedAt },
      },
    ])
    const after = kit.port.liveSnapshot(true)
    const applied = await kit.runner.apply('f18')
    expect(applied.outcome).not.toBe('applied')
    expect(kit.port.liveSnapshot(true)).toBe(after)
  })
})
