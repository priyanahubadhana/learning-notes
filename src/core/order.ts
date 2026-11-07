import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'
import type { OrderKey } from './types'

/**
 * Fractional indexing helpers. All ordering goes through this file so the
 * library can be swapped without touching the rest of the app.
 */

/**
 * Returns a key that sorts between `before` and `after`.
 * Pass null for "start of list" (before) or "end of list" (after).
 */
export function orderBetween(
  before: OrderKey | null,
  after: OrderKey | null,
): OrderKey {
  // Sync (L1): two devices can give two items the same key. Equal (or
  // crossed) neighbours would make the library throw, so place the new item
  // just after `before` instead; the id tie-break in `byOrder` keeps the
  // display the same on every device.
  if (before !== null && after !== null && before >= after) after = null
  return withSuffix(generateKeyBetween(before, after), after)
}

/** Base-62 digits, as the fractional-indexing library uses them. */
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/**
 * Adds two random digits to a fresh key, so two devices inserting at the
 * same spot almost never make the same key (1 in 3,782). The suffix never
 * ends in '0' (the library refuses such keys) and the result still sorts
 * below `after`; if not, the plain key is kept.
 */
function withSuffix(key: OrderKey, after: OrderKey | null): OrderKey {
  const pick = new Uint8Array(2)
  globalThis.crypto.getRandomValues(pick)
  const candidate = key + DIGITS[pick[0] % 62] + DIGITS[1 + (pick[1] % 61)]
  return after === null || candidate < after ? candidate : key
}

/** True if `key` is a key the library can work with. */
export function isOrderKey(key: string): boolean {
  try {
    generateKeyBetween(key, null)
    return true
  } catch {
    return false
  }
}

/** Returns `n` increasing keys between `before` and `after` (null = open end). */
export function ordersBetween(
  before: OrderKey | null,
  after: OrderKey | null,
  n: number,
): OrderKey[] {
  return generateNKeysBetween(before, after, n)
}

/**
 * Returns a key that places an item at `index` among already-sorted sibling
 * keys (which must not include the item itself). Out-of-range indexes are
 * clamped, so a large index means "at the end".
 */
export function orderAtIndex(
  sortedSiblings: readonly OrderKey[],
  index: number,
): OrderKey {
  const i = Math.max(0, Math.min(index, sortedSiblings.length))
  return orderBetween(sortedSiblings[i - 1] ?? null, sortedSiblings[i] ?? null)
}

/**
 * Returns final keys for siblings listed in display order.
 * `existing[i]` is item i's current key, or null if it has none yet (new).
 *
 * Keeps as many current keys as possible (the longest run already in
 * increasing order), so only moved or new items get new keys.
 */
export function assignOrders(
  existing: readonly (OrderKey | null)[],
): OrderKey[] {
  const keep = longestIncreasing(existing)
  const result: OrderKey[] = []
  let i = 0
  while (i < existing.length) {
    const key = existing[i]
    if (keep.has(i) && key !== null) {
      result[i] = key
      i++
      continue
    }
    // A run of items that need new keys: fill between the kept neighbours.
    let end = i
    while (end < existing.length && !keep.has(end)) end++
    const before = i > 0 ? result[i - 1] : null
    const after = end < existing.length ? existing[end] : null
    generateNKeysBetween(before, after, end - i).forEach((k, j) => {
      result[i + j] = k
    })
    i = end
  }
  return result
}

/** Indexes of the longest strictly increasing run of non-null keys. */
function longestIncreasing(keys: readonly (OrderKey | null)[]): Set<number> {
  // tails[n] = index of the smallest last key of any increasing run of length n+1
  const tails: number[] = []
  const prev: number[] = new Array<number>(keys.length).fill(-1)
  keys.forEach((key, i) => {
    if (key === null) return
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if ((keys[tails[mid]] as OrderKey) < key) lo = mid + 1
      else hi = mid
    }
    if (lo > 0) prev[i] = tails[lo - 1]
    tails[lo] = i
  })

  const result = new Set<number>()
  let i = tails.length > 0 ? tails[tails.length - 1] : -1
  while (i !== -1) {
    result.add(i)
    i = prev[i]
  }
  return result
}

/**
 * Sort comparator by `order`. Uses plain string comparison (not
 * localeCompare), which is what fractional-index keys are designed for.
 */
export function byOrder(
  a: { order: OrderKey; id?: string },
  b: { order: OrderKey; id?: string },
): number {
  if (a.order < b.order) return -1
  if (a.order > b.order) return 1
  // Equal keys (made on two devices): the id decides, the same everywhere.
  const ai = a.id ?? ''
  const bi = b.id ?? ''
  return ai < bi ? -1 : ai > bi ? 1 : 0
}
