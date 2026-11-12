import { describe, expect, it } from 'vitest'
import { CATALOG, validPlan } from './planFixtures'
import { validatePlan } from './validate'

/**
 * Fuzzing (design section 15): 10,000 cases, no library. A seeded generator
 * makes the run repeatable. Two kinds of case:
 * - random values, none of which can be a valid plan (they always lack `steps`);
 * - a valid plan with 1 to 2 mutations, each one known to break validity.
 * The validator must return at least one `{path, message}` and never throw.
 */

const CASES = 10_000

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
type Rng = () => number
const pick = <T>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]
const int = (r: Rng, n: number) => Math.floor(r() * n)

const WORDS = [
  '',
  'a',
  'x'.repeat(200),
  '__proto__',
  'constructor',
  'prototype',
  '$from',
  '</untrusted>',
  '"}]}',
  's1',
  's99',
  'notebooks.create',
  'steps',
  'args',
  '\u0000',
  '‮',
  '😀',
  '../..',
  '{{x}}',
  'null',
  'toString',
]
const KEYS = [
  ...WORDS,
  'version',
  'id',
  'goal',
  'origin',
  'destination',
  'sources',
  'effort',
  'tool',
  'toolVersion',
  'placement',
  'dependsOn',
  'optional',
  'enabled',
  'budget',
]

function randomValue(r: Rng, depth = 0): unknown {
  const kind = int(r, depth > 4 ? 7 : 10)
  switch (kind) {
    case 0:
      return null
    case 1:
      return undefined
    case 2:
      return r() < 0.5
    case 3:
      return pick(r, [0, -1, 1, 1.5, NaN, Infinity, -Infinity, 2 ** 53, 1e308])
    case 4:
      return pick(r, WORDS)
    case 5:
      return int(r, 1000)
    case 6:
      return pick(r, [Symbol('s'), 10n, () => 1, new Date(0), /x/, new Map()])
    case 7:
    case 8:
      return Array.from({ length: int(r, 6) }, () => randomValue(r, depth + 1))
    default: {
      const o: Record<string, unknown> = {}
      for (let i = int(r, 6); i > 0; i--)
        o[pick(r, KEYS)] = randomValue(r, depth + 1)
      // Never a valid plan: a plan must have `steps`.
      delete o.steps
      return o
    }
  }
}

type Plan = Record<string, unknown>
type Step = Record<string, unknown>
const stepsOf = (p: Plan) => p.steps as Step[]

/** Each mutation returns true if it applied. Every one makes the plan invalid. */
const MUTATIONS: readonly ((p: Plan, r: Rng) => boolean)[] = [
  (p) => {
    stepsOf(p)[0].tool = 'nope.nothing'
    return true
  },
  (p) => {
    stepsOf(p)[1].toolVersion = 99
    return true
  },
  (p) => {
    stepsOf(p)[2].id = 's1'
    return true
  },
  (p) => {
    stepsOf(p)[0].dependsOn = ['s3']
    return true
  },
  (p) => {
    stepsOf(p)[1].dependsOn = ['s42']
    return true
  },
  (p) => {
    stepsOf(p)[1].args = { notebookId: { $from: 's3.pageId' }, brief: 'x' }
    return true
  },
  (p) => {
    stepsOf(p)[1].args = { notebookId: { $from: 's1.nothing' }, brief: 'x' }
    return true
  },
  (p, r) => {
    ;(stepsOf(p)[0].args as Step)[pick(r, ['extra', 'pages', 'x y'])] = 1
    return true
  },
  (p) => {
    delete (stepsOf(p)[0].args as Step).title
    return true
  },
  (p) => {
    ;(stepsOf(p)[0].args as Step).title = 123
    return true
  },
  (p) => {
    p.steps = []
    return true
  },
  (p) => {
    p.steps = Array.from({ length: 41 }, (_, i) => ({
      id: `s${i + 1}`,
      tool: 'notebooks.create',
      toolVersion: 1,
      args: { title: 't' },
    }))
    return true
  },
  (p) => {
    delete p.version
    return true
  },
  (p, r) => {
    p.version = pick(r, [0, 2, '1', null])
    return true
  },
  (p, r) => {
    p.origin = pick(r, ['web', '', 5])
    return true
  },
  (p) => {
    stepsOf(p)[0].args = JSON.parse('{"title":"t","__proto__":{"a":1}}')
    return true
  },
  (p) => {
    ;(stepsOf(p)[0].args as Step).title = 'x'.repeat(121)
    return true
  },
  (p) => {
    stepsOf(p)[0].args = { title: 't', style: { view: 'grid' } }
    return true
  },
  (p) => {
    stepsOf(p)[0].dependsOn = ['s2']
    stepsOf(p)[1].dependsOn = ['s1']
    return true
  },
  (p) => {
    ;(stepsOf(p)[0].args as Step).summary = 'y'.repeat(300 * 1024)
    return true
  },
  (p) => {
    let d: unknown = 'x'
    for (let i = 0; i < 100; i++) d = { a: d }
    ;(stepsOf(p)[0].args as Step).summary = d
    return true
  },
  (p, r) => {
    p.destination = pick(r, [
      { kind: 'moon' },
      { kind: 'notebook' },
      {},
      null,
      'library',
    ])
    return true
  },
  (p, r) => {
    stepsOf(p)[1].id = pick(r, ['step', 'S2', 's', 's2x', ''])
    return true
  },
  (p) => {
    stepsOf(p)[1].args = {
      notebookId: { $from: 's1.notebookId', more: 1 },
      brief: 'x',
    }
    return true
  },
  (p) => {
    stepsOf(p)[2].args = { pageId: 'p1', count: 0 }
    return true
  },
  (p) => {
    delete p.goal
    return true
  },
  (p) => {
    p.id = 42
    return true
  },
  (p) => {
    stepsOf(p)[1].placement = { in: 's3.pageId' }
    return true
  },
  (p) => {
    stepsOf(p)[0].enabled = false
    return true
  },
  (p) => {
    stepsOf(p)[2].args = {
      pageId: { $from: 's2.pageId' },
      count: { $from: 's2.pageId' },
    }
    return true
  },
  (p) => {
    p.extraTopLevel = true
    return true
  },
]

describe('validatePlan fuzz', () => {
  it('the base plan is valid, so every failure below comes from the mutation', () => {
    expect(validatePlan(validPlan(), CATALOG)).toEqual([])
  })

  it(`${CASES} random and mutated broken plans: none pass, none throw`, () => {
    const r = mulberry32(20261112)
    let random = 0
    let mutated = 0
    const started = performance.now()
    for (let i = 0; i < CASES; i++) {
      let input: unknown
      if (i % 2 === 0) {
        input = randomValue(r)
        if (
          typeof input === 'object' &&
          input !== null &&
          !Array.isArray(input)
        )
          delete (input as Plan).steps
        random++
      } else {
        const plan = validPlan()
        const n = 1 + int(r, 2)
        for (let k = 0; k < n; k++) {
          try {
            pick(r, MUTATIONS)(plan, r)
          } catch {
            // Only when an earlier mutation already emptied the steps (still broken).
          }
        }
        input = plan
        mutated++
      }
      let errors: ReturnType<typeof validatePlan> | undefined
      try {
        errors = validatePlan(input, CATALOG, {
          surface: r() < 0.5 ? 'app' : 'mcp',
        })
      } catch (e) {
        throw new Error(`case ${i} threw: ${String(e)}`, { cause: e })
      }
      if (errors.length < 1)
        throw new Error(
          `case ${i} was accepted: ${JSON.stringify(input).slice(0, 300)}`,
        )
      for (const e of errors) {
        if (
          typeof e.path !== 'string' ||
          typeof e.message !== 'string' ||
          e.message === ''
        )
          throw new Error(`case ${i} has a bad error: ${JSON.stringify(e)}`)
      }
    }
    const ms = Math.round(performance.now() - started)
    console.log(
      `fuzz: ${CASES} cases (${random} random, ${mutated} mutated) in ${ms} ms`,
    )
    expect(random + mutated).toBe(CASES)
    expect(ms).toBeLessThan(20_000)
  })
})
