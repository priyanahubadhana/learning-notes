import { memStore } from '../../app/tools/store'

/**
 * Which locked things are open right now. It lives only in memory, so a
 * reload, a closed tab or a restart always starts locked. An entry is the id
 * of whatever carries the lock (a page, a notebook or a database).
 */

export const unlockedIds = memStore<readonly string[]>([])

export const isUnlocked = (id: string): boolean =>
  unlockedIds.get().includes(id)

export function unlock(id: string): void {
  if (!isUnlocked(id)) unlockedIds.set([...unlockedIds.get(), id])
}

export function relockAll(): void {
  if (unlockedIds.get().length > 0) unlockedIds.set([])
}

/** Locks everything except the given ids (used when you leave a locked page). */
export function relockExcept(keep: readonly string[]): void {
  const now = unlockedIds.get()
  const next = now.filter((id) => keep.includes(id))
  if (next.length !== now.length) unlockedIds.set(next)
}

/** Minutes of no use before everything locks again. */
export const IDLE_CHOICES = [1, 2, 5, 10, 15, 30] as const
export const DEFAULT_IDLE_MINUTES = 5

// ---- Pause after wrong codes: 5 wrong tries, then a wait that doubles ----

export const FAIL_LIMIT = 5
let failures = 0
let blockedUntil = 0

export function noteFailure(now: number = Date.now()): void {
  failures += 1
  if (failures % FAIL_LIMIT === 0) {
    const round = failures / FAIL_LIMIT
    blockedUntil = now + 30_000 * 2 ** (round - 1)
  }
}
export function noteSuccess(): void {
  failures = 0
  blockedUntil = 0
}
/** Seconds still to wait (0 = try now). */
export const waitSeconds = (now: number = Date.now()): number =>
  Math.max(0, Math.ceil((blockedUntil - now) / 1000))
