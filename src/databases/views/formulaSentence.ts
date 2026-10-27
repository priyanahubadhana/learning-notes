import type { DbColumn } from '../../core/types'
import { t, type MessageKey } from '../../i18n/t'
import { cellText } from '../cellDisplay'
import { choiceOptions } from '../columnTypes'
import {
  isParseError,
  parseFormula,
  type FormulaNode,
} from '../formula/formulaParser'
import { numberForInput, typedNumber } from './columnFilters'

/**
 * The formula sentence builder ("If [Confidence] is below [3], write
 * [Redo], otherwise write [OK]") and the plain-English "Means: …" line
 * for typed formulas. A rule turns into an ordinary formula, and simple
 * formulas turn back into a rule, so either way of writing one works.
 */

/** A column the builder can test; `column` null is the title column. */
export interface RuleColumn {
  name: string
  column: DbColumn | null
}

export type RuleOp =
  | 'lt'
  | 'gt'
  | 'lte'
  | 'gte'
  | 'eq'
  | 'ne'
  | 'empty'
  | 'notEmpty'
  | 'checked'
  | 'notChecked'

export interface FormulaRule {
  columnName: string
  op: RuleOp
  /** As typed (a number shows as shown in the column: 75 for 75 %). */
  value: string
  then: string
  otherwise: string
}

const COMPARE: Partial<Record<RuleOp, string>> = {
  lt: '<',
  gt: '>',
  lte: '<=',
  gte: '>=',
  eq: '=',
  ne: '<>',
}

/** Conditions the builder offers for a column, in menu order. */
export function ruleOps(column: DbColumn | null): RuleOp[] {
  const type = column?.type
  if (type === 'number') {
    return ['lt', 'gt', 'lte', 'gte', 'eq', 'ne', 'empty', 'notEmpty']
  }
  if (type === 'checkbox') return ['checked', 'notChecked']
  if (type === 'date') return ['empty', 'notEmpty']
  return ['eq', 'ne', 'empty', 'notEmpty']
}

/** True if the condition needs a value ("is below 3" but not "is empty"). */
export const needsValue = (op: RuleOp) => op in COMPARE

/** "is below", "is empty" … (stars columns read as ratings). */
export function ruleOpLabel(op: RuleOp): string {
  return t(`formula.op.${op}` as MessageKey)
}

const quote = (text: string) => `"${text.replace(/"/g, '""')}"`

/** The formula a rule stands for; null while its value is missing. */
export function ruleFormula(
  rule: FormulaRule,
  column: DbColumn | null,
): string | null {
  const ref = `[${rule.columnName}]`
  let test: string
  if (rule.op === 'empty') test = `${ref} = ""`
  else if (rule.op === 'notEmpty') test = `${ref} <> ""`
  else if (rule.op === 'checked') test = `${ref} = TRUE`
  else if (rule.op === 'notChecked') test = `${ref} = FALSE`
  else {
    let value: string
    if (column?.type === 'number') {
      const n = typedNumber(rule.value, column)
      if (n === null) return null
      value = String(n)
    } else {
      if (rule.value.trim() === '') return null
      value = quote(rule.value)
    }
    test = `${ref} ${COMPARE[rule.op]} ${value}`
  }
  return `IF(${test}, ${quote(rule.then)}, ${quote(rule.otherwise)})`
}

type Literal = number | string | boolean

function literal(node: FormulaNode): Literal | undefined {
  if (node.kind === 'number' || node.kind === 'text' || node.kind === 'bool') {
    return node.value
  }
  if (node.kind === 'unary' && node.arg.kind === 'number') {
    return node.op === '-' ? -node.arg.value : node.arg.value
  }
  return undefined
}

/** A test like `[Confidence] < 3` as a column name, condition and value. */
function condition(
  node: FormulaNode,
): { name: string; op: RuleOp; value: Literal | null } | null {
  if (node.kind !== 'binary' || node.left.kind !== 'ref') return null
  const value = literal(node.right)
  if (value === undefined) return null
  const name = node.left.name
  if (typeof value === 'boolean') {
    if (node.op !== '=') return null
    return { name, op: value ? 'checked' : 'notChecked', value: null }
  }
  if (value === '' && (node.op === '=' || node.op === '<>')) {
    return { name, op: node.op === '=' ? 'empty' : 'notEmpty', value: null }
  }
  const op = (Object.keys(COMPARE) as RuleOp[]).find(
    (k) => COMPARE[k] === node.op,
  )
  return op ? { name, op, value } : null
}

/** An IF with one test and two answers, or null for any other formula. */
function ifShape(formula: string) {
  const tree = parseFormula(formula)
  if (isParseError(tree)) return null
  if (tree.kind !== 'call' || tree.name.toUpperCase() !== 'IF') return null
  if (tree.args.length !== 3) return null
  const test = condition(tree.args[0])
  const then = literal(tree.args[1])
  const otherwise = literal(tree.args[2])
  if (!test || then === undefined || otherwise === undefined) return null
  return { test, then, otherwise }
}

const findColumn = (columns: readonly RuleColumn[], name: string) =>
  columns.find((c) => c.name.toLocaleLowerCase() === name.toLocaleLowerCase())

/**
 * A formula as a builder rule, or null if the builder can't show it
 * (then it is edited as typed, under "Advanced").
 */
export function formulaRule(
  formula: string,
  columns: readonly RuleColumn[],
): FormulaRule | null {
  const shape = ifShape(formula)
  if (!shape) return null
  const { test, then, otherwise } = shape
  const target = findColumn(columns, test.name)
  if (!target || !ruleOps(target.column).includes(test.op)) return null
  if (typeof then !== 'string' || typeof otherwise !== 'string') return null
  const isNumber = target.column?.type === 'number'
  if (test.value !== null && isNumber !== (typeof test.value === 'number')) {
    return null
  }
  return {
    columnName: target.name,
    op: test.op,
    value:
      typeof test.value === 'number'
        ? numberForInput(test.value, target.column)
        : String(test.value ?? ''),
    then,
    otherwise,
  }
}

/** A value as it reads in a sentence: 3, 75%, “Done”, nothing. */
function spoken(value: Literal, column: DbColumn | null, quoted: boolean) {
  if (typeof value === 'number') {
    return column?.config.format === 'percent'
      ? cellText(value, column)
      : cellText(value)
  }
  if (value === '') return t('formula.means.blank')
  if (typeof value === 'boolean') return String(value)
  return quoted ? `“${value}”` : value
}

/** A column, a number or TODAY() as it reads in a sentence. */
function operand(node: FormulaNode): string | null {
  if (node.kind === 'ref') return node.name
  if (node.kind === 'call' && node.name.toUpperCase() === 'TODAY') {
    return node.args.length === 0 ? t('formula.means.today') : null
  }
  const value = literal(node)
  return typeof value === 'number' ? cellText(value) : null
}

const MATH: Record<string, MessageKey> = {
  '+': 'formula.means.plus',
  '-': 'formula.means.minus',
  '*': 'formula.means.times',
  '/': 'formula.means.dividedBy',
}

/**
 * What a typed formula means in plain words, for the common shapes only:
 * an IF with one test, simple maths, days between dates. Null otherwise.
 */
export function formulaMeaning(
  formula: string,
  columns: readonly RuleColumn[] = [],
): string | null {
  const shape = ifShape(formula)
  if (shape) {
    const { test, then, otherwise } = shape
    const column = findColumn(columns, test.name)?.column ?? null
    return t('formula.means.if', {
      condition: t(`formula.cond.${test.op}` as MessageKey, {
        column: test.name,
        value: test.value === null ? '' : spoken(test.value, column, true),
      }),
      then: spoken(then, null, false),
      otherwise: spoken(otherwise, null, false),
    })
  }
  const tree = parseFormula(formula)
  if (isParseError(tree)) return null
  if (tree.kind === 'binary' && MATH[tree.op]) {
    const left = operand(tree.left)
    const right = operand(tree.right)
    if (left === null || right === null) return null
    return t(MATH[tree.op], { left, right })
  }
  if (
    tree.kind === 'call' &&
    tree.name.toUpperCase() === 'DAYS' &&
    tree.args.length === 2
  ) {
    const [end, start] = tree.args
    const endText = operand(end)
    const startText = operand(start)
    if (!endText || !startText || end.kind === 'number') return null
    if (start.kind === 'call')
      return t('formula.means.daysUntil', { date: endText })
    if (end.kind === 'call')
      return t('formula.means.daysSince', { date: startText })
    return t('formula.means.daysBetween', { start: startText, end: endText })
  }
  return null
}

/** The first option name of a choice column (a handy starting value). */
export function firstOptionName(column: DbColumn | null): string {
  return column ? (choiceOptions(column)[0]?.name ?? '') : ''
}
