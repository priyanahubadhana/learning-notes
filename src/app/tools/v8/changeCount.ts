import { useState } from 'react'

/**
 * Visible feedback (TB-70): counts up each time `key` changes, never on the
 * first render. 0 means "nothing changed yet". A control shows the shared
 * glow (`pcard-glow`, 700 ms) while the count is above 0, restarted by `key`.
 */
export function useChangeCount(key: string | number): number {
  const [s, setS] = useState({ key, n: 0 })
  if (s.key !== key) setS({ key, n: s.n + 1 })
  return s.n
}

/** The same for several controls at once (the chips of one row). */
export function useChangeCounts(
  keys: Readonly<Record<string, string | number>>,
): Record<string, number> {
  const [s, setS] = useState({
    keys,
    counts: Object.fromEntries(Object.keys(keys).map((k) => [k, 0])),
  })
  const changed = Object.keys(keys).filter((k) => s.keys[k] !== keys[k])
  if (changed.length > 0) {
    const counts = { ...s.counts }
    for (const k of changed) counts[k] = (counts[k] ?? 0) + 1
    setS({ keys, counts })
  }
  return s.counts
}
