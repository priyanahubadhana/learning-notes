import type { FormulaNode } from './formulaParser'
import {
  compareValues,
  DAY_MS,
  dateToMs,
  dayFromUtcMs,
  dayOf,
  fail,
  flatten,
  isBlank,
  isDate,
  isDayString,
  isError,
  localDay,
  normalizeDate,
  toBoolean,
  toNumber,
  toText,
  valuesEqual,
  type DateValue,
  type FValue,
  type FormulaError,
} from './formulaValue'

/**
 * Formula evaluator: walks a parsed formula with a fixed list of functions.
 * Errors are values (they flow up to the result), never thrown.
 */

export interface FormulaContext {
  /** The value of a column of the current row, by name (as written). */
  ref: (name: string) => FValue
  /** "Now" in milliseconds, so TODAY()/NOW() are testable. */
  now: number
}

/** Longest text a formula may build (stops runaway REPT-style growth). */
const MAX_TEXT = 100_000

/** Evaluates a parsed formula for one row. */
export function evaluate(node: FormulaNode, ctx: FormulaContext): FValue {
  switch (node.kind) {
    case 'number':
    case 'text':
    case 'bool':
      return node.value
    case 'ref':
      return ctx.ref(node.name)
    case 'unary': {
      const n = toNumber(evaluate(node.arg, ctx))
      if (isError(n)) return n
      return node.op === '-' ? -n : n
    }
    case 'binary':
      return binary(
        node.op,
        evaluate(node.left, ctx),
        evaluate(node.right, ctx),
      )
    case 'call':
      return call(node.name, node.args, ctx)
  }
}

function firstError(...values: FValue[]): FormulaError | undefined {
  for (const v of values) {
    if (isError(v)) return v
    if (Array.isArray(v)) {
      const inner = firstError(...v)
      if (inner) return inner
    }
  }
  return undefined
}

/** A number result; infinities and NaN become errors. */
function num(n: number): FValue {
  return Number.isFinite(n) ? n : fail('tooBig')
}

function date(ms: number, withTime: boolean): DateValue {
  return { date: withTime ? new Date(ms).toISOString() : dayFromUtcMs(ms) }
}

function isMoment(value: DateValue): boolean {
  return !isDayString(value.date)
}

function binary(op: string, a: FValue, b: FValue): FValue {
  const error = firstError(a, b)
  if (error) return error

  switch (op) {
    case '&': {
      const text = toText(a) + toText(b)
      return text.length > MAX_TEXT ? fail('tooBig') : text
    }
    case '=':
      return valuesEqual(a, b)
    case '<>':
      return !valuesEqual(a, b)
    case '<':
    case '>':
    case '<=':
    case '>=': {
      if (isBlank(a) || isBlank(b)) return false
      const c = compareMixed(a, b)
      if (op === '<') return c < 0
      if (op === '>') return c > 0
      if (op === '<=') return c <= 0
      return c >= 0
    }
  }

  // Date maths: date ± days, date − date = days between.
  if (isDate(a) && (op === '+' || op === '-') && !isDate(b)) {
    const days = toNumber(b)
    if (isError(days)) return days
    const delta = (op === '+' ? days : -days) * DAY_MS
    return date(dateToMs(a) + delta, isMoment(a))
  }
  if (isDate(a) && isDate(b) && op === '-') {
    return (dateToMs(a) - dateToMs(b)) / DAY_MS
  }

  const x = toNumber(a)
  const y = toNumber(b)
  if (isError(x)) return x
  if (isError(y)) return y
  switch (op) {
    case '+':
      return num(x + y)
    case '-':
      return num(x - y)
    case '*':
      return num(x * y)
    case '/':
      return y === 0 ? fail('divZero') : num(x / y)
    case '^':
      return num(x ** y)
  }
  return fail('syntax', op)
}

/** Compares, reading text as a number when the other side is a number. */
function compareMixed(a: FValue, b: FValue): number {
  if (typeof a === 'number' || typeof b === 'number') {
    const x = toNumber(a)
    const y = toNumber(b)
    if (!isError(x) && !isError(y)) return x - y
  }
  return compareValues(a, b)
}

/** A function of evaluated arguments. */
type Fn = (args: FValue[], ctx: FormulaContext) => FValue

interface FnDef {
  min: number
  /** Infinity = any number of arguments. */
  max: number
  /** Errors in arguments are passed through unless the function opts out. */
  fn: Fn
}

/** Functions that need unevaluated arguments (they skip unused branches). */
type LazyFn = (args: FormulaNode[], ctx: FormulaContext) => FValue

const LAZY: Record<string, { min: number; max: number; fn: LazyFn }> = {
  IF: {
    min: 2,
    max: 3,
    fn: ([test, yes, no], ctx) => {
      const t = evaluate(test, ctx)
      if (isError(t)) return t
      if (toBoolean(t)) return evaluate(yes, ctx)
      return no ? evaluate(no, ctx) : null
    },
  },
  IFERROR: {
    min: 2,
    max: 2,
    fn: ([value, fallback], ctx) => {
      const v = evaluate(value, ctx)
      return firstError(v) ? evaluate(fallback, ctx) : v
    },
  },
  AND: {
    min: 1,
    max: Infinity,
    fn: (args, ctx) => {
      for (const arg of args) {
        const v = evaluate(arg, ctx)
        if (isError(v)) return v
        if (!toBoolean(v)) return false
      }
      return true
    },
  },
  OR: {
    min: 1,
    max: Infinity,
    fn: (args, ctx) => {
      for (const arg of args) {
        const v = evaluate(arg, ctx)
        if (isError(v)) return v
        if (toBoolean(v)) return true
      }
      return false
    },
  },
}

/** Numbers among the arguments (lists flattened, blanks skipped). */
function numbersOf(args: FValue[]): number[] | FormulaError {
  const out: number[] = []
  for (const v of flatten(args)) {
    if (isBlank(v)) continue
    const n = toNumber(v)
    if (isError(n)) return n
    out.push(n)
  }
  return out
}

function mathFn(f: (n: number) => number): FnDef {
  return {
    min: 1,
    max: 1,
    fn: ([a]) => {
      const n = toNumber(a)
      return isError(n) ? n : num(f(n))
    },
  }
}

function textFn(f: (s: string) => FValue): FnDef {
  return { min: 1, max: 1, fn: ([a]) => f(toText(a)) }
}

function asDate(value: FValue): DateValue | FormulaError {
  if (isDate(value)) return value
  if (typeof value === 'string') {
    const d = normalizeDate(value)
    if (d) return { date: d }
  }
  if (Array.isArray(value) && value.length === 1) return asDate(value[0])
  return fail('notDate', toText(value))
}

/** Round half away from zero to `digits` places (Excel's ROUND). */
function round(n: number, digits: number): number {
  const f = 10 ** digits
  return (Math.sign(n) * Math.round(Math.abs(n) * f + Number.EPSILON)) / f
}

const FUNCTIONS: Record<string, FnDef> = {
  // Logic
  NOT: { min: 1, max: 1, fn: ([a]) => !toBoolean(a) },
  ISBLANK: { min: 1, max: 1, fn: ([a]) => isBlank(a) },

  // Maths
  SUM: {
    min: 1,
    max: Infinity,
    fn: (args) => {
      const ns = numbersOf(args)
      return isError(ns) ? ns : num(ns.reduce((s, n) => s + n, 0))
    },
  },
  AVERAGE: {
    min: 1,
    max: Infinity,
    fn: (args) => {
      const ns = numbersOf(args)
      if (isError(ns)) return ns
      return ns.length === 0
        ? null
        : num(ns.reduce((s, n) => s + n, 0) / ns.length)
    },
  },
  MIN: {
    min: 1,
    max: Infinity,
    fn: (args) => {
      const ns = numbersOf(args)
      if (isError(ns)) return ns
      return ns.length === 0 ? null : Math.min(...ns)
    },
  },
  MAX: {
    min: 1,
    max: Infinity,
    fn: (args) => {
      const ns = numbersOf(args)
      if (isError(ns)) return ns
      return ns.length === 0 ? null : Math.max(...ns)
    },
  },
  COUNT: {
    min: 1,
    max: Infinity,
    fn: (args) => flatten(args).filter((v) => !isBlank(v)).length,
  },
  ROUND: {
    min: 1,
    max: 2,
    fn: ([a, d]) => {
      const n = toNumber(a)
      const digits = d === undefined ? 0 : toNumber(d)
      if (isError(n)) return n
      if (isError(digits)) return digits
      return num(round(n, Math.max(-10, Math.min(10, Math.trunc(digits)))))
    },
  },
  FLOOR: mathFn(Math.floor),
  CEILING: mathFn(Math.ceil),
  ABS: mathFn(Math.abs),
  SQRT: mathFn(Math.sqrt),
  POWER: {
    min: 2,
    max: 2,
    fn: ([a, b]) => binary('^', a, b),
  },
  MOD: {
    min: 2,
    max: 2,
    fn: ([a, b]) => {
      const x = toNumber(a)
      const y = toNumber(b)
      if (isError(x)) return x
      if (isError(y)) return y
      if (y === 0) return fail('divZero')
      return num(x - y * Math.floor(x / y)) // sign of the divisor, like Excel
    },
  },

  // Text
  LEN: textFn((s) => [...s].length),
  UPPER: textFn((s) => s.toLocaleUpperCase()),
  LOWER: textFn((s) => s.toLocaleLowerCase()),
  TRIM: textFn((s) => s.trim().replace(/\s+/g, ' ')),
  TEXT: textFn((s) => s),
  VALUE: {
    min: 1,
    max: 1,
    fn: ([a]) => toNumber(typeof a === 'string' ? a.replace(/,/g, '') : a),
  },
  LEFT: {
    min: 1,
    max: 2,
    fn: ([a, n]) => {
      const count = n === undefined ? 1 : toNumber(n)
      if (isError(count)) return count
      return [...toText(a)].slice(0, Math.max(0, count)).join('')
    },
  },
  RIGHT: {
    min: 1,
    max: 2,
    fn: ([a, n]) => {
      const count = n === undefined ? 1 : toNumber(n)
      if (isError(count)) return count
      const chars = [...toText(a)]
      return count <= 0 ? '' : chars.slice(-count).join('')
    },
  },
  MID: {
    min: 3,
    max: 3,
    fn: ([a, s, n]) => {
      const start = toNumber(s)
      const count = toNumber(n)
      if (isError(start)) return start
      if (isError(count)) return count
      const from = Math.max(0, start - 1) // 1 = first character, as in Excel
      return [...toText(a)].slice(from, from + Math.max(0, count)).join('')
    },
  },
  CONCAT: {
    min: 1,
    max: Infinity,
    fn: (args) => {
      const text = args.map(toText).join('')
      return text.length > MAX_TEXT ? fail('tooBig') : text
    },
  },
  JOIN: {
    min: 1,
    max: 2,
    fn: ([list, sep]) => {
      const items = flatten([list]).filter((v) => !isBlank(v))
      const text = items
        .map(toText)
        .join(sep === undefined ? ', ' : toText(sep))
      return text.length > MAX_TEXT ? fail('tooBig') : text
    },
  },
  CONTAINS: {
    min: 2,
    max: 2,
    fn: ([a, part]) => {
      const needle = toText(part).toLocaleLowerCase()
      if (Array.isArray(a)) {
        return flatten(a).some((v) => toText(v).toLocaleLowerCase() === needle)
      }
      return toText(a).toLocaleLowerCase().includes(needle)
    },
  },
  SUBSTITUTE: {
    min: 3,
    max: 3,
    fn: ([a, find, by]) => {
      const f = toText(find)
      if (f === '') return toText(a)
      const text = toText(a).split(f).join(toText(by))
      return text.length > MAX_TEXT ? fail('tooBig') : text
    },
  },

  // Dates
  TODAY: { min: 0, max: 0, fn: (_, ctx) => ({ date: localDay(ctx.now) }) },
  NOW: {
    min: 0,
    max: 0,
    fn: (_, ctx) => ({ date: new Date(ctx.now).toISOString() }),
  },
  DATE: {
    min: 3,
    max: 3,
    fn: (args) => {
      const ns = args.map(toNumber)
      const error = ns.find(isError)
      if (error) return error
      const [y, m, d] = ns as number[]
      const ms = Date.UTC(Math.trunc(y), Math.trunc(m) - 1, Math.trunc(d))
      return Number.isFinite(ms) ? date(ms, false) : fail('notDate')
    },
  },
  YEAR: dayPart(0),
  MONTH: dayPart(1),
  DAY: dayPart(2),
  DAYS: {
    min: 2,
    max: 2,
    fn: ([end, start]) => {
      const a = asDate(end)
      const b = asDate(start)
      if (isError(a)) return a
      if (isError(b)) return b
      const ms = (d: DateValue) => Date.parse(`${dayOf(d)}T00:00:00Z`)
      return Math.round((ms(a) - ms(b)) / DAY_MS)
    },
  },
  DATEADD: {
    min: 2,
    max: 3,
    fn: ([d, n, unit]) => {
      const start = asDate(d)
      const amount = toNumber(n)
      if (isError(start)) return start
      if (isError(amount)) return amount
      const u = unit === undefined ? 'days' : toText(unit).toLowerCase()
      const at = new Date(dateToMs(start))
      const whole = Math.trunc(amount)
      if (u.startsWith('day')) at.setUTCDate(at.getUTCDate() + whole)
      else if (u.startsWith('week')) at.setUTCDate(at.getUTCDate() + whole * 7)
      else if (u.startsWith('month')) addMonths(at, whole)
      else if (u.startsWith('year')) addMonths(at, whole * 12)
      else return fail('notDate', toText(unit ?? null))
      const ms = at.getTime()
      return Number.isFinite(ms) ? date(ms, isMoment(start)) : fail('notDate')
    },
  },
}

/** Adds months, keeping the day but never spilling into the next month
 * (31 Jan + 1 month = 28 Feb), like Excel's EDATE. */
function addMonths(at: Date, months: number): void {
  const day = at.getUTCDate()
  at.setUTCDate(1)
  at.setUTCMonth(at.getUTCMonth() + months)
  const last = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0),
  ).getUTCDate()
  at.setUTCDate(Math.min(day, last))
}

function dayPart(index: number): FnDef {
  return {
    min: 1,
    max: 1,
    fn: ([a]) => {
      const d = asDate(a)
      return isError(d) ? d : Number(dayOf(d).split('-')[index])
    },
  }
}

function call(name: string, args: FormulaNode[], ctx: FormulaContext): FValue {
  const lazy = LAZY[name]
  if (lazy) {
    if (args.length < lazy.min || args.length > lazy.max) {
      return fail('argCount', name)
    }
    return lazy.fn(args, ctx)
  }
  const def = FUNCTIONS[name]
  if (!def) return fail('unknownFunction', name)
  if (args.length < def.min || args.length > def.max) {
    return fail('argCount', name)
  }
  const values = args.map((a) => evaluate(a, ctx))
  if (name !== 'ISBLANK') {
    const error = firstError(...values)
    if (error) return error
  }
  return def.fn(values, ctx)
}

/** Names of all formula functions (for the formula helper and tests). */
export const FORMULA_FUNCTIONS: readonly string[] = [
  ...Object.keys(LAZY),
  ...Object.keys(FUNCTIONS),
].sort()
