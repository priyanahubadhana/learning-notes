import { fail, type FormulaError } from './formulaValue'

/**
 * Formula parser: turns text like `IF([Score] >= 90, "A", "B")` into a tree.
 *
 * Our own small, Excel-like language. Nothing is ever run as code: the tree
 * is only walked by the evaluator, which knows a fixed list of functions.
 *
 * - Columns: `[Column name]` (names cannot contain `[` or `]`).
 * - Text: "double quotes"; a quote inside text is written twice ("").
 * - Numbers: 12, 1.5, 2e3. Yes/no: TRUE, FALSE.
 * - Operators (loosest first): = <> != < > <= >= · & (join text) · + - ·
 *   * / · ^ · unary minus. Function arguments are split by `,` or `;`.
 */

export type FormulaNode =
  | { kind: 'number'; value: number }
  | { kind: 'text'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'ref'; name: string }
  | { kind: 'call'; name: string; args: FormulaNode[] }
  | { kind: 'unary'; op: '-' | '+'; arg: FormulaNode }
  | { kind: 'binary'; op: BinaryOp; left: FormulaNode; right: FormulaNode }

export type BinaryOp =
  '=' | '<>' | '<' | '>' | '<=' | '>=' | '&' | '+' | '-' | '*' | '/' | '^'

/** Longest formula text accepted. */
export const MAX_FORMULA_LENGTH = 2000
/** Deepest nesting accepted (keeps the evaluator's stack small). */
const MAX_DEPTH = 64

interface Token {
  type: 'number' | 'text' | 'ref' | 'name' | 'op' | '(' | ')' | ','
  value: string
  /** Position in the source text (start, end exclusive). */
  start: number
  end: number
}

class ParseError extends Error {
  readonly result: FormulaError
  constructor(result: FormulaError) {
    super(result.error)
    this.result = result
  }
}

const OPERATORS = [
  '<=',
  '>=',
  '<>',
  '!=',
  '=',
  '<',
  '>',
  '&',
  '+',
  '-',
  '*',
  '/',
  '^',
]

/** Splits formula text into tokens. */
function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const ch = source[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    const start = i
    if (/[0-9.]/.test(ch)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(source.slice(i))
      if (!m) throw new ParseError(fail('syntax', ch))
      i += m[0].length
      tokens.push({ type: 'number', value: m[0], start, end: i })
    } else if (ch === '"') {
      let text = ''
      i++
      for (;;) {
        if (i >= source.length) throw new ParseError(fail('syntax', '"'))
        if (source[i] === '"') {
          if (source[i + 1] === '"') {
            text += '"'
            i += 2
            continue
          }
          i++
          break
        }
        text += source[i++]
      }
      tokens.push({ type: 'text', value: text, start, end: i })
    } else if (ch === '[') {
      const close = source.indexOf(']', i)
      if (close === -1) throw new ParseError(fail('syntax', '['))
      const name = source.slice(i + 1, close).trim()
      if (name.includes('[')) throw new ParseError(fail('syntax', '['))
      i = close + 1
      tokens.push({ type: 'ref', value: name, start, end: i })
    } else if (/[\p{L}_]/u.test(ch)) {
      const m = /^[\p{L}_][\p{L}\p{N}_.]*/u.exec(source.slice(i))!
      i += m[0].length
      tokens.push({ type: 'name', value: m[0], start, end: i })
    } else if (ch === '(' || ch === ')') {
      i++
      tokens.push({ type: ch, value: ch, start, end: i })
    } else if (ch === ',' || ch === ';') {
      i++
      tokens.push({ type: ',', value: ',', start, end: i })
    } else {
      const op = OPERATORS.find((o) => source.startsWith(o, i))
      if (!op) throw new ParseError(fail('syntax', ch))
      i += op.length
      tokens.push({ type: 'op', value: op === '!=' ? '<>' : op, start, end: i })
    }
  }
  return tokens
}

/** Operator levels, loosest first. */
const LEVELS: BinaryOp[][] = [
  ['=', '<>', '<', '>', '<=', '>='],
  ['&'],
  ['+', '-'],
  ['*', '/'],
]

/** Recursive-descent parser over the tokens. */
function parseTokens(tokens: Token[]): FormulaNode {
  let pos = 0
  const peek = () => tokens[pos] as Token | undefined
  const next = () => tokens[pos++]
  const expect = (type: Token['type']) => {
    const token = next()
    if (token?.type !== type) {
      throw new ParseError(fail('syntax', token?.value ?? type))
    }
    return token
  }

  const binary = (level: number, depth: number): FormulaNode => {
    if (depth > MAX_DEPTH) throw new ParseError(fail('tooDeep'))
    if (level === LEVELS.length) return power(depth)
    let left = binary(level + 1, depth + 1)
    for (;;) {
      const token = peek()
      const op = token?.value as BinaryOp
      if (token?.type !== 'op' || !LEVELS[level].includes(op)) return left
      next()
      const right = binary(level + 1, depth + 1)
      left = { kind: 'binary', op, left, right }
    }
  }

  // Power binds tighter than a leading minus (-2^2 = -4) and groups to the
  // right (2^3^2 = 2^9), as in maths.
  const power = (depth: number): FormulaNode => {
    const base = unary(depth + 1)
    const token = peek()
    if (token?.type === 'op' && token.value === '^') {
      next()
      const exponent = unaryOrPower(depth + 1)
      return { kind: 'binary', op: '^', left: base, right: exponent }
    }
    return base
  }

  const unaryOrPower = (depth: number): FormulaNode => {
    const token = peek()
    if (token?.type === 'op' && (token.value === '-' || token.value === '+')) {
      next()
      const arg = unaryOrPower(depth + 1)
      return { kind: 'unary', op: token.value, arg }
    }
    return power(depth)
  }

  const unary = (depth: number): FormulaNode => {
    if (depth > MAX_DEPTH) throw new ParseError(fail('tooDeep'))
    const token = peek()
    if (token?.type === 'op' && (token.value === '-' || token.value === '+')) {
      next()
      // "-x^2" = -(x^2)
      const arg = power(depth + 1)
      return { kind: 'unary', op: token.value, arg }
    }
    return primary(depth + 1)
  }

  const primary = (depth: number): FormulaNode => {
    const token = next()
    if (!token) throw new ParseError(fail('syntax'))
    switch (token.type) {
      case 'number':
        return { kind: 'number', value: Number(token.value) }
      case 'text':
        return { kind: 'text', value: token.value }
      case 'ref':
        return { kind: 'ref', name: token.value }
      case '(': {
        const inner = binary(0, depth + 1)
        expect(')')
        return inner
      }
      case 'name': {
        const upper = token.value.toUpperCase()
        if (peek()?.type !== '(') {
          if (upper === 'TRUE' || upper === 'FALSE') {
            return { kind: 'bool', value: upper === 'TRUE' }
          }
          throw new ParseError(fail('syntax', token.value))
        }
        next()
        const args: FormulaNode[] = []
        if (peek()?.type !== ')') {
          for (;;) {
            args.push(binary(0, depth + 1))
            if (peek()?.type !== ',') break
            next()
          }
        }
        expect(')')
        return { kind: 'call', name: upper, args }
      }
      default:
        throw new ParseError(fail('syntax', token.value))
    }
  }

  const tree = binary(0, 0)
  if (pos < tokens.length) throw new ParseError(fail('syntax', peek()!.value))
  return tree
}

/** Parses formula text; returns the tree or an error value. */
export function parseFormula(source: string): FormulaNode | FormulaError {
  if (source.length > MAX_FORMULA_LENGTH) return fail('tooLong')
  try {
    const tokens = tokenize(source)
    if (tokens.length === 0) return { kind: 'text', value: '' }
    return parseTokens(tokens)
  } catch (error) {
    if (error instanceof ParseError) return error.result
    throw error
  }
}

/** True if a parse result is an error. */
export function isParseError(
  result: FormulaNode | FormulaError,
): result is FormulaError {
  return 'error' in result
}

/** Column names a formula refers to (each once, as written). */
export function formulaReferences(source: string): string[] {
  try {
    const names = tokenize(source)
      .filter((t) => t.type === 'ref')
      .map((t) => t.value)
    return [...new Set(names)]
  } catch {
    return []
  }
}

/**
 * Rewrites `[from]` references to `[to]` (after a column rename), leaving
 * everything else exactly as typed. Names match ignoring case.
 */
export function renameReference(
  source: string,
  from: string,
  to: string,
): string {
  let tokens: Token[]
  try {
    tokens = tokenize(source)
  } catch {
    return source
  }
  const fold = (s: string) => s.toLocaleLowerCase()
  let out = ''
  let last = 0
  for (const token of tokens) {
    if (token.type !== 'ref' || fold(token.value) !== fold(from)) continue
    out += `${source.slice(last, token.start)}[${to}]`
    last = token.end
  }
  return out + source.slice(last)
}
