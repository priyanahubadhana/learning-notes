import { describe, expect, it } from 'vitest'
import { toCatalog } from '../aitools/catalog'
import { validatePlan } from '../aitools/validate'
import {
  check,
  isReady,
  newDraft,
  reduce,
  toPlan,
  type Draft,
} from './buildState'

const tools = toCatalog()
const opts = { id: 'job_t', goal: 'Habits', defaultBrief: 'Clear notes' }
const add = (d: Draft, tool: string) => reduce(d, { type: 'add', tool })
const titled = (): Draft =>
  reduce(newDraft(), {
    type: 'destination',
    destination: { kind: 'new_notebook', title: 'Habits' },
  })
type P = {
  steps: { id: string; tool: string; args: Record<string, unknown> }[]
}

describe('build draft', () => {
  it('adds, moves, unticks and removes steps', () => {
    let d = add(
      add(add(titled(), 'pages.write_notes'), 'cards.make_recall'),
      'styles.apply',
    )
    const [a, b, c] = d.steps.map((s) => s.uid)
    d = reduce(d, { type: 'move', uid: c, by: -1 })
    expect(d.steps.map((s) => s.uid)).toEqual([a, c, b])
    d = reduce(d, { type: 'move', uid: a, by: -1 }) // at the top: no change
    expect(d.steps[0].uid).toBe(a)
    d = reduce(d, { type: 'toggle', uid: b })
    expect(d.steps.find((s) => s.uid === b)?.enabled).toBe(false)
    d = reduce(d, { type: 'remove', uid: c })
    expect(d.steps.map((s) => s.uid)).toEqual([a, b])
  })

  it('needs a title, steps, and a page before cards', () => {
    expect(check(newDraft(), tools).plan).toBe('noTitle')
    expect(check(titled(), tools).plan).toBe('empty')
    const d = add(titled(), 'cards.make_recall')
    const c = check(d, tools)
    expect(c.steps[d.steps[0].uid]).toBe('needsPage')
    expect(isReady(c)).toBe(false)
    const ok = add(add(titled(), 'pages.write_notes'), 'cards.make_recall')
    expect(isReady(check(ok, tools))).toBe(true)
  })

  it('unticking the page step makes the cards step wait for a page', () => {
    let d = add(add(titled(), 'pages.write_notes'), 'cards.make_recall')
    d = reduce(d, { type: 'toggle', uid: d.steps[0].uid })
    expect(check(d, tools).steps[d.steps[1].uid]).toBe('needsPage')
  })

  it('a page destination already has a page', () => {
    const d = reduce(add(newDraft(), 'cards.make_recall'), {
      type: 'destination',
      destination: { kind: 'page', id: 'p1', notebookId: 'nb1' },
    })
    expect(isReady(check(d, tools))).toBe(true)
  })
})

describe('toPlan', () => {
  it('makes a plan the validator accepts, notebook first, steps linked', () => {
    let d = add(
      add(add(titled(), 'pages.write_notes'), 'cards.make_recall'),
      'styles.apply',
    )
    d = reduce(d, { type: 'edit', uid: d.steps[1].uid, patch: { count: 7 } })
    const p = toPlan(d, tools, opts) as unknown as P
    expect(validatePlan(p, tools)).toEqual([])
    expect(p.steps.map((s) => s.tool)).toEqual([
      'notebooks.create',
      'pages.write_notes',
      'cards.make_recall',
      'styles.apply',
    ])
    expect(p.steps[1].args).toEqual({
      notebookId: { $from: 's1.notebookId' },
      brief: 'Clear notes',
    })
    expect(p.steps[2].args).toEqual({
      pageId: { $from: 's2.pageId' },
      count: 7,
    })
  })

  it('leaves unticked steps out and renumbers', () => {
    let d = add(add(titled(), 'pages.write_notes'), 'styles.apply')
    d = reduce(d, { type: 'toggle', uid: d.steps[0].uid })
    const p = toPlan(d, tools, opts) as unknown as P
    expect(p.steps.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(validatePlan(p, tools)).toEqual([])
  })

  it('uses the chosen notebook or page directly', () => {
    const nb = reduce(add(newDraft(), 'pages.write_notes'), {
      type: 'destination',
      destination: { kind: 'notebook', id: 'nb9' },
    })
    const p = toPlan(nb, tools, opts) as unknown as P
    expect(p.steps[0].args).toEqual({ notebookId: 'nb9', brief: 'Clear notes' })
    expect(validatePlan(p, tools)).toEqual([])
  })
})
