import { describe, expect, it } from 'vitest'
import gen from './catalog.gen.json'
import { toCatalog } from './catalog'
import { onePlan, CATALOG } from './planFixtures'
import { AI_TOOLS, AI_TOOLS_BY_ID } from './registry'
import { validatePlan } from './validate'

describe('catalog file', () => {
  it('is up to date (run `npm run aitools:catalog` if this fails)', () => {
    expect(gen).toEqual(toCatalog())
  })

  it('is plain JSON with no examples', () => {
    expect(JSON.parse(JSON.stringify(CATALOG))).toEqual(CATALOG)
    for (const tool of CATALOG) expect(tool).not.toHaveProperty('examples')
  })
})

describe('registry', () => {
  it('has the twelve mapped tools and a lookup for each', () => {
    expect(AI_TOOLS.map((t) => t.id)).toEqual([
      'notebooks.create',
      'notebooks.create_from_spec',
      'pages.write_notes',
      'cards.make_recall',
      'cards.make_cloze',
      'databases.create',
      'styles.apply',
      'pages.refine',
      'pages.rename',
      'tabs.rename',
      'tabs.set_hidden',
      'summaries.set',
    ])
    for (const tool of AI_TOOLS) expect(AI_TOOLS_BY_ID.get(tool.id)).toBe(tool)
  })
})

describe.each(AI_TOOLS.map((t) => [t.id, t] as const))(
  'contract: %s',
  (_id, tool) => {
    const surface = tool.surfaces.includes('app') ? 'app' : 'mcp'
    const check = (args: object) =>
      validatePlan(onePlan(tool.id, args), CATALOG, { surface })
    it('has a complete definition', () => {
      expect(tool.id).toMatch(/^[a-z]+\.[a-z]+(_[a-z]+)*$/)
      expect(Number.isInteger(tool.version) && tool.version >= 1).toBe(true)
      for (const text of [tool.label, tool.group, tool.summary]) {
        expect(text.trim().length).toBeGreaterThan(0)
      }
      expect(tool.aiDescription.length).toBeGreaterThan(40)
      expect(tool.aiDescription.length).toBeLessThan(400)
      expect(tool.inputs.type).toBe('object')
      expect(tool.inputs.additionalProperties).toBe(false)
      expect(tool.outputs.type).toBe('object')
      expect(tool.writes.length).toBeGreaterThan(0)
      expect(tool.permissions.respectsLocks).toBe(true)
      expect(tool.idempotent).toBe(true)
      expect(tool.surfaces.length).toBeGreaterThan(0)
      expect(tool.limits.timeoutMs).toBeGreaterThan(0)
      expect(tool.offline).toBe(tool.cost.fill === 'none')
      expect(tool.examples.good.length).toBeGreaterThan(0)
      expect(tool.examples.bad.length).toBeGreaterThan(0)
    })

    it('accepts every good example in a minimal plan', () => {
      for (const args of tool.examples.good) {
        expect(check(args)).toEqual([])
      }
    })

    it('refuses every bad example at the expected path', () => {
      for (const bad of tool.examples.bad) {
        const errors = check(bad.args)
        const want = `/steps/0/args${bad.path}`
        expect(
          errors.map((e) => e.path),
          JSON.stringify(bad.args),
        ).toContain(want)
      }
    })

    it('names only fields that exist in its inputs (examples are not stale)', () => {
      const props = Object.keys(tool.inputs.properties ?? {})
      for (const args of tool.examples.good) {
        for (const key of Object.keys(args)) expect(props).toContain(key)
      }
    })
  },
)
