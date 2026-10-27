import { describe, expect, it } from 'vitest'
import type { DbColumn } from '../../core/types'
import {
  formulaMeaning,
  formulaRule,
  ruleFormula,
  ruleOps,
  type FormulaRule,
  type RuleColumn,
} from './formulaSentence'

const column = (name: string, type: string, config = {}): DbColumn => ({
  id: name,
  databaseId: 'd',
  name,
  type,
  config,
  order: 'a',
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
})

const confidence = column('Confidence', 'number', { format: 'stars' })
const score = column('Score', 'number', { format: 'percent' })
const done = column('Done', 'checkbox')
const status = column('Status', 'choice', {
  options: [{ id: 'o1', name: 'Done', color: 'green' }],
})
const columns: RuleColumn[] = [
  { name: 'Lesson', column: null },
  ...[confidence, score, done, status].map((c) => ({
    name: c.name,
    column: c,
  })),
]

const rule = (changes: Partial<FormulaRule>): FormulaRule => ({
  columnName: 'Confidence',
  op: 'lt',
  value: '3',
  then: 'Redo',
  otherwise: 'OK',
  ...changes,
})

describe('formula sentence builder', () => {
  it('turns a sentence into a formula', () => {
    expect(ruleFormula(rule({}), confidence)).toBe(
      'IF([Confidence] < 3, "Redo", "OK")',
    )
    expect(ruleFormula(rule({ columnName: 'Score', value: '75' }), score)).toBe(
      'IF([Score] < 0.75, "Redo", "OK")',
    )
    expect(ruleFormula(rule({ columnName: 'Done', op: 'checked' }), done)).toBe(
      'IF([Done] = TRUE, "Redo", "OK")',
    )
    expect(
      ruleFormula(
        rule({ columnName: 'Lesson', op: 'eq', value: 'Say "hi"' }),
        null,
      ),
    ).toBe('IF([Lesson] = "Say ""hi""", "Redo", "OK")')
    expect(ruleFormula(rule({ op: 'empty', value: '' }), confidence)).toBe(
      'IF([Confidence] = "", "Redo", "OK")',
    )
  })

  it('waits for a missing or wrong value', () => {
    expect(ruleFormula(rule({ value: '' }), confidence)).toBeNull()
    expect(ruleFormula(rule({ value: 'abc' }), confidence)).toBeNull()
  })

  it('reads simple formulas back as a sentence', () => {
    const back = (r: FormulaRule, c: DbColumn | null) =>
      formulaRule(ruleFormula(r, c)!, columns)
    const tries: [FormulaRule, DbColumn | null][] = [
      [rule({}), confidence],
      [rule({ columnName: 'Score', value: '75' }), score],
      [rule({ columnName: 'Done', op: 'notChecked', value: '' }), done],
      [rule({ columnName: 'Status', op: 'ne', value: 'Done' }), status],
      [rule({ columnName: 'Lesson', op: 'notEmpty', value: '' }), null],
    ]
    for (const [r, c] of tries) expect(back(r, c)).toEqual(r)
    // Names match ignoring case, and spacing doesn't matter.
    expect(formulaRule('if([confidence]>=4,"Good","")', columns)).toEqual(
      rule({ op: 'gte', value: '4', then: 'Good', otherwise: '' }),
    )
  })

  it('leaves other formulas to the typed box', () => {
    for (const formula of [
      '',
      '[Confidence] * 2',
      'IF([Confidence] < 3, "Redo")',
      'IF([Confidence] < [Score], "Redo", "OK")',
      'IF([Nope] < 3, "Redo", "OK")',
      'IF([Done] < 3, "Redo", "OK")',
      'IF([Confidence] = "x", "Redo", "OK")',
      'IF([Confidence] < 3, 1, 2)',
      'IF(AND([Confidence] < 3, [Done]), "Redo", "OK")',
    ]) {
      expect(formulaRule(formula, columns)).toBeNull()
    }
  })

  it('offers conditions that fit the column', () => {
    expect(ruleOps(done)).toEqual(['checked', 'notChecked'])
    expect(ruleOps(confidence)).toContain('lt')
    expect(ruleOps(null)).not.toContain('lt')
    expect(ruleOps(column('When', 'date'))).toEqual(['empty', 'notEmpty'])
  })
})

describe('formula meaning', () => {
  it('explains the common shapes in plain words', () => {
    expect(formulaMeaning('IF([Confidence] < 3, "Redo", "OK")', columns)).toBe(
      'if Confidence is below 3, write Redo, otherwise OK',
    )
    expect(formulaMeaning('IF([Score] >= 0.75, "Pass", "")', columns)).toBe(
      'if Score is at least 75%, write Pass, otherwise nothing',
    )
    expect(formulaMeaning('IF([Status] = "Done", "✓", "")', columns)).toBe(
      'if Status is “Done”, write ✓, otherwise nothing',
    )
    expect(formulaMeaning('IF([Done] = TRUE, 1, 0)')).toBe(
      'if Done is ticked, write 1, otherwise 0',
    )
    expect(formulaMeaning('[Score] * 1.5')).toBe('Score times 1.5')
    expect(formulaMeaning('[Price] - [Discount]')).toBe('Price minus Discount')
    expect(formulaMeaning('DAYS([Exam date], TODAY())')).toBe(
      'days from today until Exam date',
    )
    expect(formulaMeaning('DAYS(TODAY(), [Started])')).toBe(
      'days since Started',
    )
    expect(formulaMeaning('DAYS([End], [Start])')).toBe(
      'days from Start to End',
    )
  })

  it('says nothing for other formulas', () => {
    for (const formula of [
      '',
      'IF(',
      '[A] * [B] + 1',
      'ROUND([Score], 1)',
      'IF(AND([A] < 1, [B]), "x", "y")',
      'IF([A] < 1, [B], "y")',
      '"a" & "b"',
    ]) {
      expect(formulaMeaning(formula)).toBeNull()
    }
  })
})
