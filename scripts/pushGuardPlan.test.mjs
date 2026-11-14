import { describe, expect, it } from 'vitest'
import { planChecks } from './push-guard-plan.mjs'

describe('planChecks: which checks run for which branch and files', () => {
  it('docs-only on main: prettier and links only', () => {
    const p = planChecks('main', ['docs/CHANGELOG.md', 'README.md'])
    expect(p.eslint).toEqual([])
    expect(p.tsc).toBe(false)
    expect(p.vitestRelated).toEqual([])
    expect(p.ratchet).toBe(false)
    expect(p.specs).toEqual([])
  })
  it('a .mjs script on main: eslint, no tsc', () => {
    const p = planChecks('main', ['scripts/x.mjs', 'docs/a.md'])
    expect(p.eslint).toEqual(['scripts/x.mjs'])
    expect(p.tsc).toBe(false)
    expect(p.vitestRelated).toEqual([])
  })
  it('a ts file on main: eslint, tsc, related tests', () => {
    const p = planChecks('main', ['src/a/b.ts'])
    expect(p.eslint).toEqual(['src/a/b.ts'])
    expect(p.tsc).toBe(true)
    expect(p.vitestRelated).toEqual(['src/a/b.ts'])
    expect(p.specs).toEqual([])
  })
  it('json outside docs counts as code but is not linted', () => {
    const p = planChecks('main', ['package.json'])
    expect(p.eslint).toEqual([])
    expect(p.tsc).toBe(false)
  })
  it('a ts file on slice/x: also ratchet', () => {
    const p = planChecks('slice/x', ['src/a.tsx'])
    expect(p.eslint).toEqual(['src/a.tsx'])
    expect(p.tsc).toBe(true)
    expect(p.ratchet).toBe(true)
  })
  it('an e2e spec on build/next: playwright specs listed', () => {
    const p = planChecks('build/next', ['e2e/foo.spec.ts'])
    expect(p.specs).toEqual(['e2e/foo.spec.ts'])
    expect(p.eslint).toEqual(['e2e/foo.spec.ts'])
  })
  it('an e2e spec on main does not run playwright', () => {
    expect(planChecks('main', ['e2e/foo.spec.ts']).specs).toEqual([])
  })
})
