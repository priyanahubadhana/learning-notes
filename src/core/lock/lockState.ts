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

// ---- Pause after wrong codes: 3 free tries, then a growing wait ----
//
// Kept per device in localStorage (UTC ms), so a reload, a closed tab or a
// restart does not give fresh tries. This slows down someone at the device;
// it is a privacy screen, not a defence against an expert (who can clear
// browser storage), and the lock screen says so.

export const FAIL_LIMIT = 3
const SECOND = 1000
/** After the 3rd wrong try: 30 s, 1 min, 5 min, 15 min, then 1 h each. */
const WAITS = [30 * SECOND, 60 * SECOND, 300 * SECOND, 900 * SECOND]
export const MAX_WAIT_MS = 3_600_000
const KEY = 'learning-notes:lock-throttle-v1'

interface Throttle {
  failures: number
  blockedUntil: number
}

/** How long to wait after this many wrong tries in a row (0 = still free). */
export function waitAfter(failures: number): number {
  if (failures < FAIL_LIMIT) return 0
  return WAITS[failures - FAIL_LIMIT] ?? MAX_WAIT_MS
}

let memory: Throttle = { failures: 0, blockedUntil: 0 }

function read(): Throttle {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return memory
    const v = JSON.parse(raw) as Partial<Throttle>
    const failures = Number.isInteger(v.failures) ? (v.failures as number) : 0
    const until = Number.isFinite(v.blockedUntil)
      ? (v.blockedUntil as number)
      : 0
    return { failures: Math.max(0, failures), blockedUntil: until }
  } catch {
    return memory
  }
}

function write(next: Throttle): void {
  memory = next
  try {
    if (next.failures === 0) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable: the in-memory copy still slows this session */
  }
}

export function noteFailure(now: number = Date.now()): void {
  const failures = read().failures + 1
  const wait = waitAfter(failures)
  write({ failures, blockedUntil: wait > 0 ? now + wait : 0 })
}
export function noteSuccess(): void {
  write({ failures: 0, blockedUntil: 0 })
}
/** Seconds still to wait (0 = try now). A clock set far back cannot stretch it past the cap. */
export function waitSeconds(now: number = Date.now()): number {
  const left = Math.min(MAX_WAIT_MS, read().blockedUntil - now)
  return Math.max(0, Math.ceil(left / SECOND))
}
