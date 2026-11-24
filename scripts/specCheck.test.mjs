import { describe, expect, it } from 'vitest'
import {
  checkGrowth,
  checkSpec,
  detailLines,
  expandIds,
  idsInTitle,
  ipadTicks,
  latestTicks,
  scenarios,
  testTitles,
} from './spec-check-lib.mjs'

const md = [
  '## How it works',
  '- **LS-01** `has` one',
  '- **LS-02** `add` two',
  '- a line with no id',
  '- **LS-02** again',
  '## Edge cases',
  '- **LS-99** outside',
].join('\n')
const spec = {
  file: 'x.md',
  prefix: 'LS',
  from: '## How it works',
  to: '## Edge cases',
}

describe('check:spec rules', () => {
  it('SC-06: a line without id, a repeated id and a line without a test fail', () => {
    const r = checkSpec({
      spec,
      markdown: md,
      have: new Set(['LS-01']),
      testIds: [],
    })
    expect(r.problems.join('\n')).toMatch(/no id: - a line with no id/)
    expect(r.problems.join('\n')).toMatch(/LS-02 is used twice/)
    expect(r.problems.join('\n')).not.toMatch(/LS-99/)
    const none = checkSpec({ spec, markdown: md, have: new Set(), testIds: [] })
    expect(none.problems.join('\n')).toMatch(/LS-01 has no test named after it/)
  })
  it('a waiting id may lack a test; a test with a spec id outside the spec fails', () => {
    const ok = checkSpec({
      spec: { ...spec, waiting: ['LS-01', 'LS-02'] },
      markdown: md
        .replace('- a line with no id\n', '')
        .replace('- **LS-02** again\n', ''),
      have: new Set(),
      testIds: [],
    })
    expect(ok.problems).toEqual([])
    const stale = checkSpec({
      spec: { ...spec, waiting: ['LS-01'] },
      markdown: '## How it works\n- **LS-01** x\n## Edge cases',
      have: new Set(['LS-01']),
      testIds: ['LS-07'],
    })
    expect(stale.notes.join()).toMatch(/LS-01 has a test now/)
    expect(stale.problems.join()).toMatch(/names LS-07, which is not in x.md/)
  })
  it('SC-07: OPEN: fails only inside a part that is being built', () => {
    const page =
      '## How it works\n- **LS-57** words `OPEN:` judged later\n## Edge cases'
    const run = (status) =>
      checkSpec({
        spec: {
          ...spec,
          parts: [{ name: 'A1c', ids: ['LS-57..LS-58'], status }],
        },
        markdown: page,
        have: new Set(['LS-57']),
        testIds: [],
      }).problems
    expect(run('planned')).toEqual([])
    expect(run('building').join()).toMatch(
      /LS-57 has OPEN: but its part is being built/,
    )
  })
  it('SC-06: the list of specs and a waiting list only shrink', () => {
    const base = { specs: [{ file: 'a.md', waiting: ['LS-01..LS-03'] }] }
    expect(
      checkGrowth({ specs: [{ file: 'a.md', waiting: ['LS-01'] }] }, base),
    ).toEqual([])
    expect(checkGrowth({ specs: [] }, base).join()).toMatch(
      /taken out of the check/,
    )
    expect(
      checkGrowth(
        { specs: [{ file: 'a.md', waiting: ['LS-01..LS-04'] }] },
        base,
      ).join(),
    ).toMatch(/LS-04 was added/)
    expect(checkGrowth({ specs: [] }, null)).toEqual([])
  })
})

describe('check:spec helpers', () => {
  it('expands ranges', () => {
    expect(expandIds(['LS-01..LS-03', 'LS-N1..LS-N2', 'LS-12'])).toEqual([
      'LS-01',
      'LS-02',
      'LS-03',
      'LS-N1',
      'LS-N2',
      'LS-12',
    ])
  })
  it('reads ids from titles and finds tests', () => {
    expect(idsInTitle('LS-03, LS-04 and LS-N2 does it', 'LS')).toEqual([
      'LS-03',
      'LS-04',
      'LS-N2',
    ])
    expect(idsInTitle('S1 A loop  [LS-12, LS-22]', 'LS')).toEqual([
      'LS-12',
      'LS-22',
    ])
    expect(idsInTitle('a loop of LS-12', 'LS')).toEqual([])
    expect(
      testTitles('test(\'LS-01 a\', () => {})\ntest.skip("LS-02 b", f)'),
    ).toEqual(['LS-01 a', 'LS-02 b'])
    expect(detailLines(md, 'LS', spec.from, spec.to).ids).toHaveLength(3)
  })
  it('reads scenarios with their tags', () => {
    const f =
      'Feature: x\n  @ipad @notbuilt\n  Scenario: S2 a\n    Given b\n  Scenario: S3 c'
    expect(scenarios(f)).toEqual([
      { title: 'S2 a', tags: ['@ipad', '@notbuilt'] },
      { title: 'S3 c', tags: [] },
    ])
  })
  it('SC-04: reads the owner ticks and rejects bad rows', () => {
    const t = ipadTicks(
      '| Scenario | Date | Build | Result |\n| --- | --- | --- | --- |\n| S2 | 2026-11-21 | abc | pass |\n| S2 | 2026-11-22 | def | FAIL |\n| S3 | yesterday | x | pass |',
    )
    expect(t.rows).toHaveLength(2)
    expect(t.bad).toHaveLength(1)
    expect(latestTicks(t.rows).S2.result).toBe('fail')
  })
})
