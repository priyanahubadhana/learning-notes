import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { behaviourLineCount } from './dodSpec.mjs'

describe('behaviour lines in a spec', () => {
  it('counts "- When" bullets', () => {
    expect(behaviourLineCount('- When a\n* When b\ntext')).toBe(2)
  })
  it('counts bullets that start with an ID', () => {
    expect(behaviourLineCount('- PM-01 When a\n- PM-100 When b')).toBe(2)
  })
  it('counts table rows with an ID', () => {
    const t = [
      '| ID | Action | Result |',
      '| --- | --- | --- |',
      '| SP-40 | tap | opens |',
      '| RV-B01 | x | y |',
      '| SET-B12 | x | y |',
      '| NB-3 | x | y |',
      '| SR-12 | x | y |',
    ].join('\n')
    expect(behaviourLineCount(t)).toBe(5)
  })
  it('does not count headers or plain tables', () => {
    expect(
      behaviourLineCount('| Name | Value |\n| --- | --- |\n| a | b |'),
    ).toBe(0)
  })
  it('adds bullets and rows', () => {
    expect(behaviourLineCount('- When a\n| SP-1 | a | b |')).toBe(2)
  })
})

describe('the check-dod script', () => {
  const run = (args, specText) => {
    const dir = mkdtempSync(join(tmpdir(), 'dod-'))
    mkdirSync(join(dir, 'src/app'), { recursive: true })
    mkdirSync(join(dir, 'docs/features'), { recursive: true })
    mkdirSync(join(dir, 'e2e'))
    writeFileSync(
      join(dir, 'src/app/flags.ts'),
      "export const FLAG_IDS = ['a.v1'] as const",
    )
    writeFileSync(join(dir, 'docs/features/s.md'), specText)
    try {
      return {
        code: 0,
        out: execFileSync('node', ['scripts/check-dod.mjs', ...args], {
          encoding: 'utf8',
          env: { ...process.env, DOD_ROOT: dir },
        }),
      }
    } catch (e) {
      return { code: e.status, out: String(e.stdout) }
    }
  }
  const won = "\n## Won't do\n- nothing\n"
  it('accepts a table spec with flag "-"', () => {
    const r = run(['-', 's'], '| SP-1 | a | b |' + won)
    expect(r.out).toContain('no feature flag')
    expect(r.out).toContain('1 "When" line')
    expect(r.code).toBe(0)
  })
  it("still fails a missing Won't do section", () => {
    expect(run(['-', 's'], '| SP-1 | a | b |').code).toBe(1)
  })
  it('accepts a numbered Wont do heading', () => {
    expect(run(['-', 's'], "- When a\n### 8. Won't do\n").code).toBe(0)
  })
  it('still fails an unknown flag', () => {
    expect(run(['zzz', 's'], '- When a' + won).code).toBe(1)
  })
  it('still fails a spec with no behaviour lines', () => {
    expect(run(['-', 's'], 'hello' + won).code).toBe(1)
  })
})
