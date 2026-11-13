import { describe, expect, it } from 'vitest'
import { toCatalog } from '../aitools/catalog'
import { validatePlan } from '../aitools/validate'
import { isReady } from './buildState'
import {
  STUDIO_TILES,
  placements,
  studioCost,
  studioDraft,
  studioPlan,
  toggleTile,
} from './studioPlan'

const tools = toCatalog()
const brief = { brief: 'Clear notes' }
const dest = { kind: 'new_notebook', title: 'Habits' } as const
type P = { steps: { id: string; tool: string }[] }

describe('Studio: tiles toggle (SB-1)', () => {
  it('a tile switches on, then off again', () => {
    let sel: string[] = []
    sel = toggleTile(sel, 'notes')
    expect(sel).toEqual(['notes'])
    sel = toggleTile(sel, 'cards')
    expect(sel).toEqual(['notes', 'cards'])
    sel = toggleTile(sel, 'notes')
    expect(sel).toEqual(['cards'])
  })
  it('every tile is a real catalog tool the app can run', () => {
    for (const x of STUDIO_TILES) {
      const tool = tools.find((c) => c.id === x.tool)
      expect(tool, x.id).toBeTruthy()
      expect(tool!.surfaces).toContain('app')
    }
  })
})

describe('Studio: Make selected builds ONE plan (SB-2)', () => {
  it('makes a new notebook, then one step per ticked tile, in tile order', () => {
    const plan = studioPlan(
      ['cards', 'notes', 'map'],
      dest,
      tools,
      'job_s',
      brief,
    )!
    const p = plan as unknown as P
    expect(p.steps.map((s) => s.tool)).toEqual([
      'notebooks.create',
      'pages.write_notes',
      'mindmaps.add',
      'cards.make_recall',
    ])
    expect(validatePlan(plan, tools)).toEqual([])
  })
  it('adds a page to hold the result when Notes is not ticked', () => {
    const plan = studioPlan(['map'], dest, tools, 'job_s', brief)!
    const p = plan as unknown as P
    expect(p.steps.map((s) => s.tool)).toEqual([
      'notebooks.create',
      'pages.write_notes',
      'mindmaps.add',
    ])
    expect(validatePlan(plan, tools)).toEqual([])
  })
  it('puts the result in an existing notebook', () => {
    const plan = studioPlan(
      ['notes', 'cards'],
      { kind: 'notebook', id: 'nb1' },
      tools,
      'job_s',
      brief,
    )!
    const p = plan as unknown as P
    expect(p.steps[0].tool).toBe('pages.write_notes')
    expect(validatePlan(plan, tools)).toEqual([])
  })
  it('gives no plan when nothing is ticked or the place is missing', () => {
    expect(studioPlan([], dest, tools, 'j', brief)).toBeNull()
    expect(
      studioPlan(
        ['notes'],
        { kind: 'new_notebook', title: ' ' },
        tools,
        'j',
        brief,
      ),
    ).toBeNull()
    expect(
      studioPlan(['notes'], { kind: 'notebook', id: '' }, tools, 'j', brief),
    ).toBeNull()
  })
  it('the draft is ready to run when ticked and placed', () => {
    const d = studioDraft(['notes'], dest)
    expect(isReady(studioCost(d, tools).checked)).toBe(true)
  })
})

describe('Studio: combined cost (SB-3)', () => {
  it('is the sum over the ticked tiles, free by paste, and grows with each tile', () => {
    const one = studioCost(studioDraft(['notes'], dest), tools)
    const two = studioCost(studioDraft(['notes', 'cards'], dest), tools)
    expect(one.steps).toBe(2)
    expect(two.steps).toBe(3)
    expect(two.totalInr).toBeGreaterThan(one.totalInr)
    expect(two.totalInr).toBeCloseTo(
      two.perStepInr.reduce((n, x) => n + x, 0) + two.planningInr,
      8,
    )
  })
})

describe('Studio: where each output goes (A3)', () => {
  it('one row per ticked tile, in the order they run, each with its own place', () => {
    expect(placements(['cards', 'notes', 'map'])).toEqual([
      { id: 'notes', place: 'notes' },
      { id: 'map', place: 'map' },
      { id: 'cards', place: 'cards' },
    ])
  })
  it('nothing ticked, no rows', () => {
    expect(placements([])).toEqual([])
  })
})
