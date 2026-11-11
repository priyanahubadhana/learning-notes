/**
 * Fractional indexing for Deno: a key that sorts between two others. A small
 * copy of the `generateKeyBetween` of the `fractional-indexing` library the
 * app uses (src/core/order.ts), base 62 and the default key form ("a0", "a1V…").
 * parity.test.ts checks it against the library on thousands of random pairs,
 * so a key made here is always valid in the app.
 */
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const ZERO = DIGITS[0]
const SMALLEST_INTEGER = 'A00000000000000000000000000'
const idx = (c: string) => DIGITS.indexOf(c)

function midpoint(a: string, b: string | null): string {
  if (b !== null && a >= b) throw new Error(`${a} >= ${b}`)
  if (a.slice(-1) === ZERO || (b && b.slice(-1) === ZERO))
    throw new Error('trailing zero')
  if (b) {
    let n = 0
    while ((a[n] || ZERO) === b[n]) n++
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n))
  }
  const digitA = a ? idx(a[0]) : 0
  const digitB = b !== null ? idx(b[0]) : DIGITS.length
  if (digitB - digitA > 1) return DIGITS[Math.round(0.5 * (digitA + digitB))]
  if (b && b.length > 1) return b.slice(0, 1)
  return DIGITS[digitA] + midpoint(a.slice(1), null)
}

function integerLength(head: string): number {
  if (head >= 'a' && head <= 'z') return head.charCodeAt(0) - 97 + 2
  if (head >= 'A' && head <= 'Z') return 90 - head.charCodeAt(0) + 2
  throw new Error(`invalid order key head: ${head}`)
}
function integerPart(key: string): string {
  const n = integerLength(key[0])
  if (n > key.length) throw new Error(`invalid order key: ${key}`)
  return key.slice(0, n)
}
function validate(key: string): void {
  if (key === SMALLEST_INTEGER) throw new Error(`invalid order key: ${key}`)
  const i = integerPart(key)
  if (key.slice(i.length).slice(-1) === ZERO)
    throw new Error(`invalid order key: ${key}`)
}
function increment(x: string): string | null {
  const [head, ...digs] = x.split('')
  let carry = true
  for (let i = digs.length - 1; carry && i >= 0; i--) {
    const d = idx(digs[i]) + 1
    if (d === DIGITS.length) digs[i] = ZERO
    else {
      digs[i] = DIGITS[d]
      carry = false
    }
  }
  if (carry) {
    if (head === 'Z') return 'a' + ZERO
    if (head === 'z') return null
    const h = String.fromCharCode(head.charCodeAt(0) + 1)
    if (h > 'a') digs.push(ZERO)
    else digs.pop()
    return h + digs.join('')
  }
  return head + digs.join('')
}
function decrement(x: string): string | null {
  const [head, ...digs] = x.split('')
  let borrow = true
  for (let i = digs.length - 1; borrow && i >= 0; i--) {
    const d = idx(digs[i]) - 1
    if (d === -1) digs[i] = DIGITS.slice(-1)
    else {
      digs[i] = DIGITS[d]
      borrow = false
    }
  }
  if (borrow) {
    if (head === 'a') return 'Z' + DIGITS.slice(-1)
    if (head === 'A') return null
    const h = String.fromCharCode(head.charCodeAt(0) - 1)
    if (h < 'Z') digs.push(DIGITS.slice(-1))
    else digs.pop()
    return h + digs.join('')
  }
  return head + digs.join('')
}

/** A key that sorts strictly between `a` and `b` (null = the start / the end). */
export function generateKeyBetween(a: string | null, b: string | null): string {
  if (a !== null) validate(a)
  if (b !== null) validate(b)
  if (a !== null && b !== null && a >= b) throw new Error(`${a} >= ${b}`)
  if (a === null) {
    if (b === null) return 'a' + ZERO
    const ib = integerPart(b)
    const fb = b.slice(ib.length)
    if (ib === SMALLEST_INTEGER) return ib + midpoint('', fb)
    if (ib < b) return ib
    const res = decrement(ib)
    if (res === null) throw new Error('cannot decrement any more')
    return res
  }
  if (b === null) {
    const ia = integerPart(a)
    const fa = a.slice(ia.length)
    const i = increment(ia)
    return i === null ? ia + midpoint(fa, null) : i
  }
  const ia = integerPart(a)
  const fa = a.slice(ia.length)
  const ib = integerPart(b)
  const fb = b.slice(ib.length)
  if (ia === ib) return ia + midpoint(fa, fb)
  const i = increment(ia)
  if (i === null) throw new Error('cannot increment any more')
  if (i < b) return i
  return ia + midpoint(fa, null)
}

/**
 * As the app's `orderBetween` (src/core/order.ts): a key between `before` and
 * `after`, with two random digits added so two devices placing an item at the
 * same spot almost never make the same key. Never throws for stored keys: odd
 * neighbours (equal, crossed or not valid) fall back to "after `before`", or to
 * a fresh first key.
 */
export function orderBetween(
  before: string | null,
  after: string | null,
): string {
  const a = before !== null && after !== null && before >= after ? null : after
  try {
    return suffix(generateKeyBetween(before, a), a)
  } catch {
    try {
      return suffix(generateKeyBetween(before, null), null)
    } catch {
      return suffix(generateKeyBetween(null, null), null)
    }
  }
}

function suffix(key: string, after: string | null): string {
  const pick = crypto.getRandomValues(new Uint8Array(2))
  const candidate = key + DIGITS[pick[0] % 62] + DIGITS[1 + (pick[1] % 61)]
  return after === null || candidate < after ? candidate : key
}
