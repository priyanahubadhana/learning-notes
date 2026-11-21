import { describe, expect, it } from 'vitest'
import {
  parseFeature,
  readResults,
  renderReport,
} from './scenario-report-lib.mjs'

const feature = [
  'Feature: Demo',
  '  Scenario: S1 plain',
  '    Given a',
  '    Then b',
  '  @ipad',
  '  Scenario: S2 pad',
  '    Given c',
  '  @notbuilt @fail',
  '  Scenario: S3 later',
  '    Given d',
].join('\n')

const run = (title, project, status, steps, ok = true) => ({
  title,
  tests: [
    {
      projectName: project,
      status: ok ? 'expected' : 'unexpected',
      results: [{ steps }],
    },
  ],
})
const json = {
  suites: [
    {
      specs: ['bdd-chromium', 'bdd-ipad-webkit'].flatMap((p) => [
        run('S1 plain', p, 'passed', [
          { title: 'Given a' },
          { title: 'Then b' },
        ]),
        run('S2 pad', p, 'passed', [{ title: 'Given c' }]),
        run('S3 later', p, 'failed', [
          { title: 'Given d', error: { message: 'secret path in the error' } },
        ]),
      ]),
    },
  ],
}

describe('scenario report', () => {
  const f = parseFeature(feature)
  const results = readResults(json)
  it('reads scenarios, tags and steps', () => {
    expect(f.scenarios.map((s) => [s.id, s.tags, s.steps.length])).toEqual([
      ['S1', [], 2],
      ['S2', ['@ipad'], 1],
      ['S3', ['@notbuilt', '@fail'], 1],
    ])
  })
  it('SC-04: an @ipad scenario needs the owner until a tick is recorded', () => {
    const open = renderReport({
      features: [f],
      results,
      tickRows: [],
      build: 'b',
    })
    expect(open).toContain("needs the owner's iPad check")
    const ticked = renderReport({
      features: [f],
      results,
      tickRows: [
        { id: 'S2', date: '2026-11-21', build: 'abc', result: 'pass' },
      ],
      build: 'b',
    })
    expect(ticked).toContain("owner's iPad check: pass (2026-11-21, build abc)")
  })
  it('SC-05: pass, not built yet, not run, and no error text', () => {
    const page = renderReport({
      features: [f],
      results,
      tickRows: [],
      build: 'b',
    })
    expect(page).toContain('1 pass, 0 fail, 1 not built yet; 1 wait')
    expect(page).toContain('not built yet')
    expect(page).not.toContain('secret path')
    const none = renderReport({
      features: [f],
      results: {},
      tickRows: [],
      build: 'b',
    })
    expect(none).toContain('not run')
  })
  it('a not-built scenario that now passes is flagged', () => {
    const j = JSON.parse(JSON.stringify(json))
    for (const s of j.suites[0].specs)
      if (s.title === 'S3 later') s.tests[0].status = 'unexpected'
    expect(
      renderReport({
        features: [f],
        results: readResults(j),
        tickRows: [],
        build: 'b',
      }),
    ).toContain('remove @notbuilt')
  })
})
