import type { SyncStatus } from '../../sync/syncStatus'
import { isLocked } from '../../sync/lockedStatus'

/**
 * Which one problem to show at the top (docs/research/attention-alerts-2026-11.md).
 * Pure and tiny: level 1 is the locked pop-up, 2 a bright banner, 3 a calm
 * banner. Level 4 (the dot) always stays; it is not decided here.
 */
export type AttentionCode =
  | 'locked'
  | 'driveTap'
  | 'driveFull'
  | 'notAllowed'
  | 'clock'
  | 'signInAgain'
  | 'updateNeeded'
  | 'syncFailing'
  | 'backups'
  | 'storage'
  | 'setup'
  | 'update'

export interface Attention {
  code: AttentionCode
  level: 1 | 2 | 3
  /** Grows as the problem gets worse; a dismissed banner returns then. */
  worse: number
}

export interface AttentionInput {
  status: Pick<SyncStatus, 'phase' | 'problem' | 'needsDriveTap'>
  /** Failed syncs in a row (see `trackFailures`). */
  failStreak: number
  backupFailures: number
  storageHigh: boolean
  updateReady: boolean
  updateNeeded: boolean
}

/** Every problem that applies now, most urgent first. */
export function attentionList(i: AttentionInput): Attention[] {
  const s = i.status
  const out: Attention[] = []
  const add = (code: AttentionCode, level: 1 | 2 | 3, worse = 0) =>
    out.push({ code, level, worse })
  if (isLocked(s)) add('locked', 1)
  const ready = s.phase === 'ready' || s.phase === 'syncing'
  if (ready && s.needsDriveTap) add('driveTap', 2)
  if (ready && s.problem === 'driveFull') add('driveFull', 2)
  if (s.problem === 'notAllowed') add('notAllowed', 2)
  if (s.problem === 'clock') add('clock', 2)
  if (s.problem === 'signInAgain') add('signInAgain', 2)
  if (i.updateNeeded) add('updateNeeded', 2)
  if (s.problem === 'failed' && i.failStreak >= 3) {
    add('syncFailing', 2, i.failStreak)
  }
  if (i.backupFailures >= 2) add('backups', 2, i.backupFailures)
  if (i.storageHigh) add('storage', 3)
  if (s.phase === 'needsSetup') add('setup', 3)
  if (i.updateReady) add('update', 3)
  return out
}

export interface SnoozeStore {
  get(key: string): string | null
  set(key: string, value: string): void
}

export const DAY_MS = 86_400_000
const keyOf = (code: AttentionCode) => `attn.snooze.${code}`

/** Safe wrapper: storage may be blocked, then nothing is ever snoozed. */
export function browserSnooze(): SnoozeStore {
  return {
    get: (k) => {
      try {
        return localStorage.getItem(k)
      } catch {
        return null
      }
    },
    set: (k, v) => {
      try {
        localStorage.setItem(k, v)
      } catch {
        // Blocked: the banner just shows again.
      }
    },
  }
}

/** Dismiss: level 2 until the next app start, level 3 for 7 days. */
export function snooze(
  a: Attention,
  store: SnoozeStore,
  now: number,
  session: number,
): void {
  const until = a.level === 3 ? now + 7 * DAY_MS : 0
  store.set(keyOf(a.code), JSON.stringify({ until, session, worse: a.worse }))
}

export function isSnoozed(
  a: Attention,
  store: SnoozeStore,
  now: number,
  session: number,
): boolean {
  let saved: { until?: number; session?: number; worse?: number } | null
  try {
    saved = JSON.parse(store.get(keyOf(a.code)) ?? 'null')
  } catch {
    return false
  }
  if (!saved || a.level === 1) return false
  if ((saved.worse ?? 0) < a.worse) return false // got worse: show again
  if (a.level === 3) return (saved.until ?? 0) > now
  return saved.session === session // level 2: until the next start
}

/** The one thing to show: the highest level that is not snoozed. */
export function pickAttention(
  i: AttentionInput,
  store: SnoozeStore,
  now: number,
  session: number,
): Attention | null {
  return (
    attentionList(i).find((a) => !isSnoozed(a, store, now, session)) ?? null
  )
}

/** Counts failed syncs in a row; the count is also 3 after 30 minutes. */
export function trackFailures(
  prev: { count: number; since: number },
  failed: boolean,
  now: number,
): { count: number; since: number } {
  if (!failed) return { count: 0, since: 0 }
  const since = prev.count ? prev.since : now
  const count = Math.max(prev.count + 1, now - since > 30 * 60_000 ? 3 : 0)
  return { count, since }
}
