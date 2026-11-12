import { describe, expect, it } from 'vitest'
import type { Rec } from './jobTypes'
import {
  CONTENT,
  build,
  makeKit,
  onePlan,
  outputOf,
  plan,
  type Kit,
} from './testKit'

/**
 * Framework slice 5a: Pages, Tabs, Summaries (pages.rename, tabs.rename,
 * tabs.set_hidden, summaries.set). Golden plans with stored snapshots, then
 * the faults: locks, gone, stale, a bad answer. After each, either fully
 * applied or nothing written, and Undo puts everything back.
 */

const SUMMARY = {
  summary: 'A habit is a loop: cue, craving, response, reward.',
}
const content = { ...CONTENT, 'summaries.set': () => SUMMARY }

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
  return {
    notebookId: outputOf(first, 's1', 'notebookId'),
    pageId: outputOf(first, 's2', 'pageId'),
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

describe('golden plans, slice 5a', () => {
  it('g21 rename a page', async () => {
    const kit = makeKit(content)
    const { pageId, notebookId } = await seeded(kit)
    await golden(
      kit,
      planOf('g21', { kind: 'page', id: pageId }, [
        step('s1', 'pages.rename', { pageId, title: 'Habit loops' }),
      ]),
    )
    void notebookId
  })

  it('g22 rename a tab and hide another', async () => {
    const kit = makeKit(content)
    const { notebookId } = await seeded(kit)
    await golden(
      kit,
      planOf('g22', { kind: 'notebook', id: notebookId }, [
        step('s1', 'tabs.rename', {
          notebookId,
          tabId: 'cards',
          title: 'Quiz',
        }),
        step(
          's2',
          'tabs.set_hidden',
          { notebookId, tabId: 'revise', hidden: true },
          { dependsOn: ['s1'] },
        ),
      ]),
    )
  })

  it('g23 a summary from a brief, filled by the model path', async () => {
    const kit = makeKit(content)
    const { pageId } = await seeded(kit)
    await golden(
      kit,
      planOf('g23', { kind: 'page', id: pageId }, [
        step('s1', 'summaries.set', { pageId, brief: 'Three plain sentences' }),
      ]),
    )
    expect(kit.filler.log.map((r) => r.tool.id)).toContain('summaries.set')
  })

  it('g24 chain: a new notebook, a page, its summary, a renamed page and a hidden tab', async () => {
    await golden(
      makeKit(content),
      planOf('g24', { kind: 'new_notebook', title: 'Chain' }, [
        step('s1', 'notebooks.create', { title: 'Chain' }),
        step(
          's2',
          'pages.write_notes',
          { notebookId: from('s1.notebookId'), brief: 'Notes' },
          { dependsOn: ['s1'] },
        ),
        step(
          's3',
          'summaries.set',
          { pageId: from('s2.pageId'), summary: SUMMARY.summary },
          { dependsOn: ['s2'] },
        ),
        step(
          's4',
          'pages.rename',
          { pageId: from('s2.pageId'), title: 'Renamed' },
          { dependsOn: ['s2'] },
        ),
        step(
          's5',
          'tabs.set_hidden',
          {
            notebookId: from('s1.notebookId'),
            tabId: 'database',
            hidden: true,
          },
          { dependsOn: ['s1'] },
        ),
      ]),
    )
  })

  it('showing a hidden tab again removes the flag, and a no-change step writes nothing', async () => {
    const kit = makeKit(content)
    const { notebookId } = await seeded(kit)
    await build(
      kit,
      planOf('h1', { kind: 'notebook', id: notebookId }, [
        step('s1', 'tabs.set_hidden', {
          notebookId,
          tabId: 'revise',
          hidden: true,
        }),
      ]),
    )
    const before = kit.port.liveSnapshot()
    await build(
      kit,
      planOf('h2', { kind: 'notebook', id: notebookId }, [
        step('s1', 'tabs.set_hidden', {
          notebookId,
          tabId: 'revise',
          hidden: false,
        }),
      ]),
    )
    const nb = await kit.port.read('notebooks', notebookId)
    const revise = (nb!.tabs as Rec[]).find((t) => t.id === 'revise')!
    expect('hidden' in revise).toBe(false)
    expect(kit.port.liveSnapshot()).not.toBe(before)
    const again = await kit.runner.create(
      planOf('h3', { kind: 'notebook', id: notebookId }, [
        step('s1', 'tabs.set_hidden', {
          notebookId,
          tabId: 'revise',
          hidden: false,
        }),
      ]),
    )
    expect(again.ok).toBe(true)
    const ran = await kit.runner.run('h3')
    expect(ran.state).toBe('failed')
    expect(ran.notice).toBe('There was nothing to write.')
  })
})

describe('faults, slice 5a: nothing is written', () => {
  async function refused(p: Rec, kit: Kit, sentence: string): Promise<void> {
    const start = kit.port.liveSnapshot(true)
    expect((await kit.runner.create(p)).ok).toBe(true)
    const job = await kit.runner.run(String(p.id))
    expect(job.state).toBe('needs_attention')
    expect(job.steps.find((s) => s.state === 'failed')?.error).toBe(sentence)
    expect(kit.port.liveSnapshot(true)).toBe(start)
  }

  it('a tab that is not there', async () => {
    const kit = makeKit(content)
    const { notebookId } = await seeded(kit)
    await refused(
      planOf('f1', { kind: 'notebook', id: notebookId }, [
        step('s1', 'tabs.rename', { notebookId, tabId: 'nope', title: 'X' }),
      ]),
      kit,
      'The tab is gone.',
    )
  })

  it('a page that is gone', async () => {
    const kit = makeKit(content)
    await seeded(kit)
    await refused(
      planOf('f2', { kind: 'page', id: 'missing' }, [
        step('s1', 'pages.rename', { pageId: 'missing', title: 'X' }),
      ]),
      kit,
      'The page is gone.',
    )
  })

  it('a locked notebook and a locked page are never changed by AI', async () => {
    const kit = makeKit(content)
    const { notebookId, pageId } = await seeded(kit)
    const page = (await kit.port.read('pages', pageId))!
    await kit.port.commit('lockp', [
      {
        table: 'pages',
        id: pageId,
        value: { ...page, locked: true, updatedAt: Number(page.updatedAt) + 1 },
        baseRev: Number(page.updatedAt),
        before: { locked: undefined, updatedAt: page.updatedAt },
      },
    ])
    await refused(
      planOf('f3', { kind: 'page', id: pageId }, [
        step('s1', 'pages.rename', { pageId, title: 'X' }),
      ]),
      kit,
      'This page is locked.',
    )
    const nb = (await kit.port.read('notebooks', notebookId))!
    await kit.port.commit('lockn', [
      {
        table: 'notebooks',
        id: notebookId,
        value: { ...nb, editLocked: true, updatedAt: Number(nb.updatedAt) + 1 },
        baseRev: Number(nb.updatedAt),
        before: { editLocked: undefined, updatedAt: nb.updatedAt },
      },
    ])
    await refused(
      planOf('f4', { kind: 'notebook', id: notebookId }, [
        step('s1', 'tabs.set_hidden', {
          notebookId,
          tabId: 'cards',
          hidden: true,
        }),
      ]),
      kit,
      'This notebook is locked.',
    )
  })

  it('a summary on a sub-page is refused', async () => {
    const kit = makeKit(content)
    const { notebookId, pageId } = await seeded(kit)
    const child = await build(
      kit,
      planOf('c1', { kind: 'notebook', id: notebookId }, [
        step('s1', 'pages.write_notes', {
          notebookId,
          parentId: pageId,
          brief: 'Child',
        }),
      ]),
    )
    const childId = outputOf(child, 's1', 'pageId')
    await refused(
      planOf('f5', { kind: 'page', id: childId }, [
        step('s1', 'summaries.set', { pageId: childId, summary: 'x' }),
      ]),
      kit,
      'A summary belongs on a top-level page.',
    )
  })

  it('a bad summary answer is repaired once, then the step fails and nothing is written', async () => {
    const kit = makeKit({
      ...content,
      'summaries.set': () => ({ summary: '' }),
    })
    const { pageId } = await seeded(kit)
    const start = kit.port.liveSnapshot(true)
    await kit.runner.create(
      planOf('f6', { kind: 'page', id: pageId }, [
        step('s1', 'summaries.set', { pageId, brief: 'Short' }),
      ]),
    )
    const job = await kit.runner.run('f6')
    expect(job.state).toBe('needs_attention')
    expect(kit.port.liveSnapshot(true)).toBe(start)
  })

  it('the page changed after staging: Apply writes nothing and says why', async () => {
    const kit = makeKit(content)
    const { pageId } = await seeded(kit)
    await kit.runner.create(
      planOf('f7', { kind: 'page', id: pageId }, [
        step('s1', 'pages.rename', { pageId, title: 'Mine' }),
      ]),
    )
    expect((await kit.runner.run('f7')).state).toBe('preview')
    const page = (await kit.port.read('pages', pageId))!
    await kit.port.commit('other', [
      {
        table: 'pages',
        id: pageId,
        value: {
          ...page,
          title: 'Someone else',
          updatedAt: Number(page.updatedAt) + 9,
        },
        baseRev: Number(page.updatedAt),
        before: { title: page.title, updatedAt: page.updatedAt },
      },
    ])
    const after = kit.port.liveSnapshot(true)
    const applied = await kit.runner.apply('f7')
    expect(applied.outcome).not.toBe('applied')
    expect(kit.port.liveSnapshot(true)).toBe(after)
  })
})
