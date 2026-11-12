import { afterEach, describe, expect, it, vi } from 'vitest'
import { AI_TOOLS_BY_ID } from '../registry'
import type { Rec } from './jobTypes'
import { build, makeKit, onePlan, outputOf, plan, type Kit } from './testKit'

/**
 * Framework slice 5d: Tags and Library (tags.add, tags.remove, tags.rename,
 * library.pin). Golden plans with stored snapshots, then the faults: locks,
 * gone, blank or taken names, a failed write. After each, either fully applied
 * or nothing written, and one Undo puts the whole job back. None of these
 * tools needs a model, so no network call is ever made.
 */

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
  const tagged = await build(
    kit,
    planOf('base-tag', { kind: 'page', id: pageId }, [
      step('s1', 'tags.add', { pageId, tag: 'medicine/cardio' }),
    ]),
  )
  return {
    notebookId,
    pageId,
    tagId: outputOf(tagged, 's1', 'tagId'),
    parentTagId: String(
      (await kit.port.list('tags', {})).find((t) => t.name === 'medicine')!.id,
    ),
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

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('golden plans, slice 5d', () => {
  it('g41 a new nested tag on a page', async () => {
    const kit = makeKit()
    const { pageId } = await seeded(kit)
    await golden(
      kit,
      planOf('g41', { kind: 'page', id: pageId }, [
        step('s1', 'tags.add', { pageId, tag: '#Biology/Cells' }),
      ]),
    )
  })

  it('g42 an existing tag is reused (case ignored)', async () => {
    const kit = makeKit()
    const { pageId, notebookId } = await seeded(kit)
    await build(
      kit,
      planOf('g42-page', { kind: 'notebook', id: notebookId }, [
        step('s1', 'pages.write_notes', { notebookId, brief: 'More' }),
      ]),
    )
    const other = String(
      (await kit.port.list('pages', {})).find((p) => p.id !== pageId)!.id,
    )
    const before = (await kit.port.list('tags', {})).length
    await golden(
      kit,
      planOf('g42', { kind: 'page', id: other }, [
        step('s1', 'tags.add', { pageId: other, tag: 'MEDICINE/Cardio' }),
      ]),
    )
    expect((await kit.port.list('tags', {})).length).toBe(before)
  })

  it('g43 a tag taken off a page; the tag stays', async () => {
    const kit = makeKit()
    const { pageId, tagId } = await seeded(kit)
    await golden(
      kit,
      planOf('g43', { kind: 'page', id: pageId }, [
        step('s1', 'tags.remove', { pageId, tagId }),
      ]),
    )
    expect((await kit.port.read('tags', tagId))!.deletedAt).toBeNull()
    expect((await kit.port.read('pages', pageId))!.tagIds).toEqual([])
  })

  it('g44 a tag renamed (only that level)', async () => {
    const kit = makeKit()
    const { pageId, tagId, parentTagId } = await seeded(kit)
    await golden(
      kit,
      planOf('g44', { kind: 'page', id: pageId }, [
        step('s1', 'tags.rename', { tagId: parentTagId, name: 'health care' }),
      ]),
    )
    await build(
      kit,
      planOf('g44b', { kind: 'page', id: pageId }, [
        step('s1', 'tags.rename', { tagId, name: 'Heart' }),
      ]),
    )
    expect((await kit.port.read('tags', tagId))!.name).toBe('Heart')
    expect((await kit.port.read('tags', parentTagId))!.name).toBe('health-care')
  })

  it('g45 a notebook pinned, then unpinned (the flag is removed)', async () => {
    const kit = makeKit()
    const { notebookId } = await seeded(kit)
    await golden(
      kit,
      planOf('g45', { kind: 'notebook', id: notebookId }, [
        step('s1', 'library.pin', { notebookId, pinned: true }),
      ]),
    )
    expect((await kit.port.read('notebooks', notebookId))!.starred).toBe(true)
    await build(
      kit,
      planOf('g45b', { kind: 'notebook', id: notebookId }, [
        step('s1', 'library.pin', { notebookId, pinned: false }),
      ]),
    )
    expect('starred' in (await kit.port.read('notebooks', notebookId))!).toBe(
      false,
    )
  })

  it('g46 chain: a new notebook and page, a tag added and renamed, the notebook pinned; one Undo reverts all', async () => {
    await golden(
      makeKit(),
      planOf('g46', { kind: 'new_notebook', title: 'Chain' }, [
        step('s1', 'notebooks.create', { title: 'Chain' }),
        step(
          's2',
          'pages.write_notes',
          { notebookId: from('s1.notebookId'), brief: 'Notes' },
          { dependsOn: ['s1'] },
        ),
        step(
          's3',
          'tags.add',
          { pageId: from('s2.pageId'), tag: 'draft' },
          { dependsOn: ['s2'] },
        ),
        step(
          's4',
          'tags.rename',
          { tagId: from('s3.tagId'), name: 'Final' },
          { dependsOn: ['s3'] },
        ),
        step(
          's5',
          'library.pin',
          { notebookId: from('s1.notebookId'), pinned: true },
          { dependsOn: ['s1'] },
        ),
      ]),
    )
  })

  it('a tag the page already has, and a no-change pin, write nothing', async () => {
    const kit = makeKit()
    const { pageId, notebookId } = await seeded(kit)
    await kit.runner.create(
      planOf('h1', { kind: 'page', id: pageId }, [
        step('s1', 'tags.add', { pageId, tag: 'medicine/cardio' }),
      ]),
    )
    const ran = await kit.runner.run('h1')
    expect(ran.state).toBe('failed')
    expect(ran.notice).toBe('There was nothing to write.')
    await kit.runner.create(
      planOf('h2', { kind: 'notebook', id: notebookId }, [
        step('s1', 'library.pin', { notebookId, pinned: false }),
      ]),
    )
    expect((await kit.runner.run('h2')).state).toBe('failed')
  })
})

describe('faults, slice 5d: nothing is written', () => {
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
    const kit = makeKit()
    const { pageId, notebookId } = await seeded(kit)
    await refused(
      planOf('f1', { kind: 'page', id: 'missing' }, [
        step('s1', 'tags.add', { pageId: 'missing', tag: 'x' }),
      ]),
      kit,
      'The page is gone.',
    )
    await refused(
      planOf('f2', { kind: 'page', id: 'missing' }, [
        step('s1', 'tags.remove', { pageId: 'missing', tagId: 't' }),
      ]),
      kit,
      'The page is gone.',
    )
    await refused(
      planOf('f3', { kind: 'page', id: pageId }, [
        step('s1', 'tags.rename', { tagId: 'nope', name: 'x' }),
      ]),
      kit,
      'The tag is gone.',
    )
    await refused(
      planOf('f4', { kind: 'notebook', id: notebookId }, [
        step('s1', 'library.pin', { notebookId: 'nope', pinned: true }),
      ]),
      kit,
      'The notebook is gone.',
    )
  })

  it('blank and taken tag names are refused', async () => {
    const kit = makeKit()
    const { pageId, tagId, parentTagId } = await seeded(kit)
    const dest = { kind: 'page', id: pageId }
    await refused(
      planOf('f5', dest, [step('s1', 'tags.add', { pageId, tag: '#//' })]),
      kit,
      'The tag name is missing.',
    )
    await refused(
      planOf('f6', dest, [step('s1', 'tags.rename', { tagId, name: '#' })]),
      kit,
      'The tag name is missing.',
    )
    await build(
      kit,
      planOf('f7-a', dest, [
        step('s1', 'tags.add', { pageId, tag: 'medicine/valves' }),
      ]),
    )
    await refused(
      planOf('f7', dest, [
        step('s1', 'tags.rename', { tagId, name: 'VALVES' }),
      ]),
      kit,
      'That tag name is already used here.',
    )
    // The same name at another level is fine.
    await build(
      kit,
      planOf('f8', dest, [
        step('s1', 'tags.rename', { tagId: parentTagId, name: 'valves' }),
      ]),
    )
  })

  it('locked pages and notebooks are never changed by AI', async () => {
    const kit = makeKit()
    const { pageId, notebookId, tagId } = await seeded(kit)
    await lock(kit, 'pages', pageId, { editLocked: true })
    const dest = { kind: 'page', id: pageId }
    await refused(
      planOf('f9', dest, [step('s1', 'tags.add', { pageId, tag: 'new' })]),
      kit,
      'This page is locked.',
    )
    await refused(
      planOf('f10', dest, [step('s1', 'tags.remove', { pageId, tagId })]),
      kit,
      'This page is locked.',
    )
    await lock(kit, 'notebooks', notebookId, { editLocked: true })
    await refused(
      planOf('f11', { kind: 'notebook', id: notebookId }, [
        step('s1', 'library.pin', { notebookId, pinned: true }),
      ]),
      kit,
      'This notebook is locked.',
    )
  })

  it('a later step fails: the earlier tag is not written either', async () => {
    const kit = makeKit()
    const { pageId } = await seeded(kit)
    await refused(
      planOf('f12', { kind: 'page', id: pageId }, [
        step('s1', 'tags.add', { pageId, tag: 'fresh/level' }),
        step('s2', 'tags.rename', { tagId: 'nope', name: 'x' }),
      ]),
      kit,
      'The tag is gone.',
    )
    expect(
      (await kit.port.list('tags', {})).some((t) => t.name === 'fresh'),
    ).toBe(false)
  })

  it('a write that fails while applying leaves everything as it was', async () => {
    const kit = makeKit()
    const { pageId, notebookId } = await seeded(kit)
    const start = kit.port.liveSnapshot()
    for (const k of [1, 2, 3, 4]) {
      const id = `f13-${k}`
      await kit.runner.create(
        planOf(id, { kind: 'page', id: pageId }, [
          step('s1', 'tags.add', { pageId, tag: 'x/y/z' }),
          step('s2', 'library.pin', { notebookId, pinned: true }),
        ]),
      )
      expect((await kit.runner.run(id)).state).toBe('preview')
      kit.port.failOnWrite = k
      const { outcome, job } = await kit.runner.apply(id)
      expect(outcome, `write ${k}`).toBe('failed')
      expect(job.state).toBe('failed')
      expect(kit.port.liveSnapshot(), `write ${k}`).toBe(start)
    }
  })

  it('the tag changed after staging: Apply writes nothing and says why', async () => {
    const kit = makeKit()
    const { pageId, tagId } = await seeded(kit)
    await kit.runner.create(
      planOf('f14', { kind: 'page', id: pageId }, [
        step('s1', 'tags.rename', { tagId, name: 'Renamed' }),
      ]),
    )
    expect((await kit.runner.run('f14')).state).toBe('preview')
    const tag = (await kit.port.read('tags', tagId))!
    await kit.port.commit('other', [
      {
        table: 'tags',
        id: tagId,
        value: { ...tag, color: '#fff', updatedAt: Number(tag.updatedAt) + 9 },
        baseRev: Number(tag.updatedAt),
        before: { color: tag.color, updatedAt: tag.updatedAt },
      },
    ])
    const after = kit.port.liveSnapshot(true)
    const applied = await kit.runner.apply('f14')
    expect(applied.outcome).not.toBe('applied')
    expect(kit.port.liveSnapshot(true)).toBe(after)
  })
})

describe('spend limit 0: no network, no paid call', () => {
  it('every 5d tool is free, needs no model and runs without a fetch', async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error('network')
    })
    vi.stubGlobal('fetch', fetchSpy)
    const kit = makeKit()
    const { pageId, notebookId, tagId } = await seeded(kit)
    const asked = kit.filler.calls
    await build(
      kit,
      planOf('n1', { kind: 'page', id: pageId }, [
        step('s1', 'tags.add', { pageId, tag: 'offline' }),
        step('s2', 'tags.rename', { tagId, name: 'Calm' }),
        step('s3', 'tags.remove', { pageId, tagId }),
        step('s4', 'library.pin', { notebookId, pinned: true }),
      ]),
    )
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(kit.filler.calls).toBe(asked)
    for (const id of ['tags.add', 'tags.remove', 'tags.rename', 'library.pin'])
      expect(AI_TOOLS_BY_ID.get(id)!.cost).toEqual({
        class: 'none',
        fill: 'none',
        outTokens: 0,
      })
  })
})
