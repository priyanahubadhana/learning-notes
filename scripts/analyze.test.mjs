import { afterEach, describe, expect, it } from 'vitest'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { analyze, parsePage, report } from './analyze.mjs'

const dirs = []
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true })
})

/** A spec on template v2 that passes every check; `edit` breaks one thing. */
function spec({
  status = 'Confirmed',
  buildsOn = 'none, checked on 23 Nov',
  rules,
  scenarios,
  tasks,
} = {}) {
  return `# Demo (template v2)

| Status | Stage | Switch | Builds on |
| ------ | ----- | ------ | --------- |
| ${status} | \`1\` | \`demo.sw\` | ${buildsOn} |

## Rules

${rules ?? '- **DM-01** One rule.\n- **DM-N1** One never.'}

## Scenarios

${scenarios ?? '- **S1, plain.** Given a, then b (DM-01, DM-N1).\n- **S2, wrong.** Given c, then d.'}

## Confirm sheet

| Row | Statement |
| --- | --------- |
| 1   | Yes.      |

## Bottom layer: for the builders

### Tasks

| Task | Satisfies | Size | Done when |
| ---- | --------- | ---- | --------- |
${tasks ?? '| T1   | S1        | < 1 day | green |'}
`
}

function repo({
  md = spec(),
  e2e = "test('demo.sw S1 S2', () => {})",
  placement = '',
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'analyze-'))
  dirs.push(root)
  const put = (p, text) => {
    mkdirSync(dirname(join(root, p)), { recursive: true })
    writeFileSync(join(root, p), text)
  }
  put('docs/features/demo.md', md)
  put('e2e/demo.spec.ts', e2e)
  put('src/a.ts', placement)
  put('docs/metrics/ratchet.json', JSON.stringify({ privateCopies: 0 }))
  return root
}

const failedChecks = (root) =>
  analyze(root).rows.flatMap((r) => r.failed.map((f) => f.check))

describe('analyze', () => {
  it('passes a complete spec and computes Confirmed', () => {
    const r = analyze(repo())
    expect(r.rows[0].failed).toEqual([])
    expect(r.rows[0].computed).toBe('Confirmed')
    expect(r.ratchet.out).toEqual([])
  })

  it('check 1: a rule id in no scenario fails', () => {
    const root = repo({
      md: spec({
        scenarios: '- **S1, plain.** Given a, then b (DM-01).\n- **S2, x.** y.',
      }),
    })
    const r = analyze(root).rows[0]
    expect(r.failed.map((f) => f.message)).toEqual([
      'rule DM-N1 is in no scenario',
    ])
    expect(r.computed).toBe('Draft')
  })

  it('check 1: a "covered by" table row counts', () => {
    const root = repo({
      md:
        spec({ scenarios: '- **S1, a.** x.\n- **S2, b.** y.' }) +
        '\n| Must-never | Covered by |\n| --- | --- |\n| DM-01 | S1 |\n| DM-N1 | S2 |\n',
    })
    expect(failedChecks(root)).toEqual([])
  })

  it('check 2: a scenario id in no e2e file fails', () => {
    expect(failedChecks(repo({ e2e: "test('demo.sw S1', () => {})" }))).toEqual(
      [2],
    )
  })

  it('check 2: a test file that does not name the spec does not count', () => {
    expect(
      failedChecks(repo({ e2e: "test('other S1 S2', () => {})" })),
    ).toEqual([2, 2])
  })

  it('check 2: the prefixed form DM-S2 counts', () => {
    expect(
      failedChecks(repo({ e2e: "test('demo.sw S1 DM-S2', () => {})" })),
    ).toEqual([])
  })

  it('check 3: a task row without a task id fails', () => {
    expect(
      failedChecks(
        repo({ md: spec({ tasks: '| step | S1 | < 1 day | green |' }) }),
      ),
    ).toEqual([3])
  })

  it('check 3: no bottom layer fails', () => {
    const md = spec().replace('## Bottom layer: for the builders', '## Other')
    expect(failedChecks(repo({ md }))).toEqual([3])
  })

  it('check 4: an empty or missing Builds on cell fails', () => {
    expect(failedChecks(repo({ md: spec({ buildsOn: '' }) }))).toEqual([4])
    const md = spec().replace('| Builds on |', '| Other |')
    expect(failedChecks(repo({ md }))).toEqual([4])
  })

  it('check 5: more private placement functions than stored fails, equal passes', () => {
    const code = 'export function placeBar() {}\nexport const positionOf = 1\n'
    const grown = analyze(repo({ placement: code })).ratchet
    expect(grown.now.total).toBe(2)
    expect(grown.out[0]).toMatch(/grew: 2 now, 0 stored/)
    const root = repo({ placement: code })
    writeFileSync(
      join(root, 'docs/metrics/ratchet.json'),
      '{"privateCopies":2}',
    )
    expect(analyze(root).ratchet.out).toEqual([])
  })

  it('check 5: part files and tests are not counted', () => {
    const root = repo()
    mkdirSync(join(root, 'src/design/parts'), { recursive: true })
    writeFileSync(
      join(root, 'src/design/parts/BarPlace.tsx'),
      'export function placeBar() {}',
    )
    writeFileSync(join(root, 'src/a.test.ts'), 'function placeBar() {}')
    expect(analyze(root).ratchet.now.total).toBe(0)
  })

  it('check 6: Draft status stays Draft; Built is not computed; failing Confirmed becomes Draft', () => {
    expect(
      analyze(repo({ md: spec({ status: 'Draft' }) })).rows[0].computed,
    ).toBe('Draft')
    expect(
      analyze(repo({ md: spec({ status: 'Built' }) })).rows[0].computed,
    ).toBe('not computed')
    expect(analyze(repo({ md: spec({ buildsOn: '' }) })).rows[0].computed).toBe(
      'Draft',
    )
  })

  it('check 6: the report lists each page and never edits the spec', () => {
    const root = repo({ md: spec({ buildsOn: '' }) })
    const before = readFileSync(join(root, 'docs/features/demo.md'), 'utf8')
    const text = report(analyze(root))
    expect(text).toMatch(
      /\| docs\/features\/demo\.md\s+\| Confirmed\s+\| Draft\s+\| 4\s+\|/,
    )
    expect(text).toMatch(/## How to read it/)
    expect(readFileSync(join(root, 'docs/features/demo.md'), 'utf8')).toBe(
      before,
    )
  })

  it('an old-template page is skipped, not failed', () => {
    const root = repo()
    writeFileSync(
      join(root, 'docs/features/old.md'),
      '# Old\n\n## Rules\n\n- **OL-01** x\n',
    )
    const r = analyze(root)
    expect(r.skipped).toEqual(['docs/features/old.md'])
    expect(r.rows).toHaveLength(1)
  })

  it('parsePage reads the header row', () => {
    const p = parsePage(spec(), 'spec')
    expect(p.header['Switch']).toBe('`demo.sw`')
    expect(p.isV2).toBe(true)
  })
})
