import { describe, expect, it } from 'vitest'
import { evaluate, FORMULA_FUNCTIONS } from './formulaEval'
import {
  formulaReferences,
  isParseError,
  MAX_FORMULA_LENGTH,
  parseFormula,
  renameReference,
} from './formulaParser'
import { compareValues, type FValue } from './formulaValue'

const NOW = Date.UTC(2026, 9, 27, 12) // 2026-10-27 12:00 UTC

/** Evaluates `source` with the given column values. */
function run(source: string, columns: Record<string, FValue> = {}): FValue {
  const tree = parseFormula(source)
  if (isParseError(tree)) return tree
  const ref = (name: string): FValue =>
    name in columns ? columns[name] : { error: 'unknownColumn', detail: name }
  return evaluate(tree, { ref, now: NOW })
}

describe('formula parser', () => {
  it('follows maths precedence', () => {
    expect(run('1 + 2 * 3')).toBe(7)
    expect(run('(1 + 2) * 3')).toBe(9)
    expect(run('-2^2')).toBe(-4)
    expect(run('2^3^2')).toBe(512)
    expect(run('2^-1')).toBe(0.5)
    expect(run('10 - 4 - 3')).toBe(3)
    expect(run('"a" & 1 + 1')).toBe('a2')
    expect(run('1 + 1 = 2')).toBe(true)
  })

  it('reads numbers, text with doubled quotes, TRUE/FALSE', () => {
    expect(run('1.5e2')).toBe(150)
    expect(run('.5')).toBe(0.5)
    expect(run('"say ""hi"""')).toBe('say "hi"')
    expect(run('true')).toBe(true)
    expect(run('')).toBe('')
  })

  it('accepts , or ; between arguments and any case of function names', () => {
    expect(run('sum(1, 2; 3)')).toBe(6)
  })

  it('reports syntax errors instead of throwing', () => {
    for (const bad of ['1 +', '(1', '"open', '[Col', 'FOO', '1 2', '#', ')']) {
      expect(run(bad)).toMatchObject({ error: 'syntax' })
    }
    expect(run('x'.repeat(MAX_FORMULA_LENGTH + 1))).toEqual({
      error: 'tooLong',
    })
    expect(run('('.repeat(200) + '1' + ')'.repeat(200))).toEqual({
      error: 'tooDeep',
    })
  })

  it('never runs code: unknown functions are errors', () => {
    expect(run('eval("1")')).toEqual({
      error: 'unknownFunction',
      detail: 'EVAL',
    })
    expect(run('constructor()')).toMatchObject({ error: 'unknownFunction' })
  })

  it('finds and renames column references', () => {
    const f = 'IF([Score] > 90, [score] & "!", [Other name])'
    expect(formulaReferences(f)).toEqual(['Score', 'score', 'Other name'])
    expect(renameReference(f, 'Score', 'Mark')).toBe(
      'IF([Mark] > 90, [Mark] & "!", [Other name])',
    )
    // Text inside quotes is never touched.
    expect(renameReference('"[Score]" & [Score]', 'Score', 'X')).toBe(
      '"[Score]" & [X]',
    )
  })
})

describe('formula values', () => {
  it('uses column values; blank counts as 0 in maths', () => {
    expect(run('[Price] * [Amount]', { Price: 2.5, Amount: 4 })).toBe(10)
    expect(run('[Price] + 1', { Price: null })).toBe(1)
    expect(run('[Price] + 1', { Price: '41' })).toBe(42)
    expect(run('[Missing]')).toEqual({
      error: 'unknownColumn',
      detail: 'Missing',
    })
  })

  it('errors flow up; IFERROR and IF skip them', () => {
    expect(run('1 / 0 + 1')).toEqual({ error: 'divZero' })
    expect(run('"x" * 2')).toEqual({ error: 'notNumber', detail: 'x' })
    expect(run('IFERROR(1 / 0, "none")')).toBe('none')
    expect(run('IF(FALSE, 1 / 0, 5)')).toBe(5)
    expect(run('IF(1 > 2, "yes")')).toBe(null)
    expect(run('AND(FALSE, 1/0)')).toBe(false)
    expect(run('OR(TRUE, 1/0)')).toBe(true)
  })

  it('compares text ignoring case; blank equals empty text', () => {
    expect(run('"Apple" = "apple"')).toBe(true)
    expect(run('[A] = ""', { A: null })).toBe(true)
    expect(run('"10" > 9')).toBe(true)
    expect(run('[A] > 1', { A: null })).toBe(false)
  })

  it('shows numbers without float noise', () => {
    expect(run('0.1 + 0.2 & ""')).toBe('0.3')
  })

  it('maths and list functions', () => {
    const list = { L: [1, 2, null, 3] }
    expect(run('SUM([L], 4)', list)).toBe(10)
    expect(run('AVERAGE([L])', list)).toBe(2)
    expect(run('MIN([L])', list)).toBe(1)
    expect(run('MAX([L])', list)).toBe(3)
    expect(run('COUNT([L])', list)).toBe(3)
    expect(run('ROUND(2.345, 2)')).toBe(2.35)
    expect(run('ROUND(-2.5)')).toBe(-3)
    expect(run('MOD(-7, 3)')).toBe(2)
    expect(run('SQRT(-1)')).toEqual({ error: 'tooBig' })
    expect(run('ABS(-3) + FLOOR(1.7) + CEILING(1.2) + POWER(2, 3)')).toBe(14)
    expect(run('ROUND()')).toEqual({ error: 'argCount', detail: 'ROUND' })
  })

  it('text functions', () => {
    expect(run('LEN("héllo")')).toBe(5)
    expect(run('UPPER("ab") & LOWER("CD")')).toBe('ABcd')
    expect(run('TRIM("  a   b ")')).toBe('a b')
    expect(
      run('LEFT("Heart", 2) & RIGHT("Heart", 2) & MID("Heart", 2, 3)'),
    ).toBe('Hertear')
    expect(run('CONCAT("a", 1, TRUE)')).toBe('a1true')
    expect(run('JOIN([L], " / ")', { L: ['x', null, 'y'] })).toBe('x / y')
    expect(run('CONTAINS("Mitral valve", "VALVE")')).toBe(true)
    expect(run('CONTAINS([L], "b")', { L: ['a', 'B'] })).toBe(true)
    expect(run('SUBSTITUTE("a-b-c", "-", "+")')).toBe('a+b+c')
    expect(run('VALUE("1,200.5")')).toBe(1200.5)
    expect(run('ISBLANK([A])', { A: [] })).toBe(true)
    expect(run('NOT(ISBLANK("x"))')).toBe(true)
  })

  it('caps text that grows without end', () => {
    const big = 'x'.repeat(60_000)
    expect(run('[A] & [A]', { A: big })).toEqual({ error: 'tooBig' })
  })

  it('date functions and date maths', () => {
    const d = { D: { date: '2026-01-31' } }
    expect(run('TODAY()')).toEqual({ date: '2026-10-27' }) // test TZ: day of NOW
    expect(run('NOW()')).toEqual({ date: '2026-10-27T12:00:00.000Z' })
    expect(run('[D] + 1', d)).toEqual({ date: '2026-02-01' })
    expect(run('DATEADD([D], 1, "months")', d)).toEqual({ date: '2026-02-28' })
    expect(run('DATEADD([D], 2, "weeks")', d)).toEqual({ date: '2026-02-14' })
    expect(run('DATEADD([D], -1, "years")', d)).toEqual({ date: '2025-01-31' })
    expect(run('DAYS(DATE(2026, 3, 1), [D])', d)).toBe(29)
    expect(run('DATE(2026, 3, 1) - [D]', d)).toBe(29)
    expect(run('YEAR([D]) + MONTH([D]) + DAY([D])', d)).toBe(2026 + 1 + 31)
    expect(run('DAYS("2026-12-25", "2026-12-24")')).toBe(1)
    expect(run('YEAR("soon")')).toEqual({ error: 'notDate', detail: 'soon' })
    expect(run('[D] > DATE(2026, 1, 1)', d)).toBe(true)
  })

  it('lists its functions for the helper', () => {
    expect(FORMULA_FUNCTIONS).toContain('IF')
    expect(FORMULA_FUNCTIONS).toContain('DATEADD')
  })

  it('sorts mixed values: numbers, dates, text, yes/no', () => {
    const values: FValue[] = ['b', true, 2, { date: '2026-01-01' }, 'A', 1]
    expect([...values].sort(compareValues)).toEqual([
      1,
      2,
      { date: '2026-01-01' },
      'A',
      'b',
      true,
    ])
  })
})
