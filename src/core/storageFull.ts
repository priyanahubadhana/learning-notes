/** True for a browser or Dexie "no space left" failure. */
export function isStorageFull(error: unknown): boolean {
  const seen = new Set<unknown>()
  let current = error
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    const { name, inner } = current as { name?: string; inner?: unknown }
    if (name === 'QuotaExceededError') return true
    current = inner
  }
  return false
}
