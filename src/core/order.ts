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
  return generateKeyBetween(before, after)
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
  a: { order: OrderKey },
  b: { order: OrderKey },
): number {
  if (a.order < b.order) return -1
  if (a.order > b.order) return 1
  return 0
}
