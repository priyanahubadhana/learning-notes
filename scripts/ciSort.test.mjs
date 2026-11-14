import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  parseFailedLog,
  buildReport,
  testKey,
  ghReady,
} from './ci-sort-lib.mjs'

const fx = (n) =>
  readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8')

describe('parseFailedLog (real failed runs on build/next)', () => {
  it('run 43557319251: 2 failed, 1 shaky, chromium', () => {
    const p = parseFailedLog(fx('ci-e2e-flaky-43557319251.txt'))
    expect(p.failed.map((t) => `${t.file}:${t.line}`)).toEqual([
      'e2e/notebooksSearchGate3.spec.ts:64',
      'e2e/notebooksSearchGate3.spec.ts:129',
    ])
    expect(p.failed[0].project).toBe('chromium')
    expect(p.failed[0].title).toContain('touch shows "Close"')
    expect(p.flaky.map((t) => t.file)).toEqual(['e2e/paperBoxes.spec.ts'])
    expect(p.failedSteps).toEqual([])
  })
  it('run 43528030714: 4 failed on ipad-webkit plus 2 on chromium', () => {
    const p = parseFailedLog(fx('ci-webkit-43528030714.txt'))
    expect(p.failed.filter((t) => t.project === 'ipad-webkit')).toHaveLength(4)
    expect(p.failed.filter((t) => t.project === 'chromium')).toHaveLength(2)
    expect(p.flaky).toEqual([])
  })
  it('run 43542651882: the same test at two zooms is two failures', () => {
    const p = parseFailedLog(fx('ci-chromium-43542651882.txt'))
    expect(p.failed).toHaveLength(2)
    expect(p.failed[0].file).toBe('e2e/bigPageBudget.spec.ts')
  })
  it('run 43492276792: a failed checks job gives its step', () => {
    const p = parseFailedLog(fx('ci-checks-43492276792.txt'))
    expect(p.failedSteps).toEqual(['npm test'])
    expect(p.failed).toEqual([])
  })
})

describe('buildReport', () => {
  const p = parseFailedLog(fx('ci-e2e-flaky-43557319251.txt'))
  const k0 = testKey(p.failed[0])
  it('marks REPEAT, NEW, SHAKY and a changed test file', () => {
    const out = buildReport({
      parsed: p,
      history: [new Set([k0]), new Set(), new Set([k0]), new Set(), new Set()],
      changedFiles: ['e2e/notebooksSearchGate3.spec.ts'],
    })
    const text = out.join('\n')
    expect(text).toContain(
      'REPEAT: also failed in 2 of the last 5 finished runs',
    )
    expect(text).toContain('NEW')
    expect(text).toContain('SHAKY: passed on retry')
    expect(text).toContain('TEST FILE CHANGED SINCE THE LAST GREEN RUN')
    expect(out.length).toBeLessThanOrEqual(20)
    expect(out[out.length - 1]).toMatch(/^ADVICE:/)
  })
  it('a simple check says fix and push', () => {
    const out = buildReport({
      parsed: parseFailedLog(fx('ci-checks-43492276792.txt')),
      history: [],
      changedFiles: [],
    })
    expect(out[0]).toBe('SIMPLE CHECK: npm test')
    expect(out[out.length - 1]).toContain('fix and push')
  })
  it('never prints more than 20 lines', () => {
    const many = {
      failedSteps: [],
      flaky: [],
      failed: Array.from({ length: 40 }, (_, i) => ({
        project: 'chromium',
        file: `e2e/a${i}.spec.ts`,
        line: 1,
        title: 't' + i,
      })),
    }
    expect(
      buildReport({ parsed: many, history: [], changedFiles: [] }),
    ).toHaveLength(20)
  })
})

describe('ghReady', () => {
  it('is true when both gh calls work', () => {
    expect(ghReady(() => '')).toBe(true)
  })
  it('is false when gh is missing or signed out', () => {
    expect(
      ghReady(() => {
        throw new Error('no gh')
      }),
    ).toBe(false)
    expect(
      ghReady((a) => {
        if (a[0] === 'auth') throw new Error('signed out')
      }),
    ).toBe(false)
  })
})
