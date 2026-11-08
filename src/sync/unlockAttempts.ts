/**
 * Wrong passphrase / recovery code: how many tries are free and how long the
 * waits are (fix #3, research/unlock-attempts-2026-11.md). This slows down
 * someone at the person's own device; it is not a defence against offline
 * guessing (the real defences are Argon2id and the long recovery code).
 *
 * Counts and the wait end are kept per device in localStorage (UTC ms). The
 * typed text is never stored: only a salted SHA-256 of the last wrong value is
 * kept in memory, so the same wrong value twice counts once.
 */

export type SecretKind = 'passphrase' | 'code'

export const FREE_TRIES = 3
const MIN = 60_000
/** After the 3rd wrong try: 1 min, then 5, then 15, then 1 h each (never permanent). */
const WAITS = [MIN, 5 * MIN, 15 * MIN]
export const MAX_WAIT = 60 * MIN
export const CODE_LENGTH = 26
const KEY = 'learning-notes:unlock-throttle-v1'

interface Entry {
  fails: number
  lockedUntil: number
}
type Saved = Record<SecretKind, Entry>

/** How long to wait after this many wrong tries (0 = still free). */
export function waitAfter(fails: number): number {
  if (fails < FREE_TRIES) return 0
  return WAITS[fails - FREE_TRIES] ?? MAX_WAIT
}

/** Letters of a typed code after case, spaces, dashes, dots and look-alikes are tolerated. */
export function cleanCode(text: string): string {
  return text
    .toUpperCase()
    .replace(/[\s\-.]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
}

/** The number of letters typed when it is not 26 (a slip that does not count as a try); else null. */
export function codeLengthSlip(text: string): number | null {
  const n = cleanCode(text).length
  return n === CODE_LENGTH ? null : n
}

const empty = (): Saved => ({
  passphrase: { fails: 0, lockedUntil: 0 },
  code: { fails: 0, lockedUntil: 0 },
})

export interface Limiter {
  /** Milliseconds left to wait for this kind (0 = may try). */
  remaining(kind: SecretKind): number
  fails(kind: SecretKind): number
  /** A wrong try. Returns false when it did not count (same value as last time). */
  fail(kind: SecretKind, fingerprint: string): boolean
  /** A right try: both counters go back to zero. */
  succeed(): void
}

export function createLimiter(
  now: () => number = Date.now,
  storage: () => Storage | null = () => {
    try {
      return localStorage
    } catch {
      return null
    }
  },
): Limiter {
  const lastWrong: Partial<Record<SecretKind, string>> = {}
  let memory: Saved = empty()

  const read = (): Saved => {
    try {
      const raw = storage()?.getItem(KEY)
      if (!raw) return memory
      const p = JSON.parse(raw) as Partial<Saved>
      const out = empty()
      for (const k of ['passphrase', 'code'] as const) {
        const e = p[k]
        if (e && Number.isFinite(e.fails) && Number.isFinite(e.lockedUntil)) {
          out[k] = {
            fails: Math.max(0, Math.floor(e.fails)),
            // A clock moved far back must not lock for longer than the cap.
            lockedUntil: Math.min(e.lockedUntil, now() + MAX_WAIT),
          }
        }
      }
      return out
    } catch {
      return memory
    }
  }
  const write = (s: Saved) => {
    memory = s
    try {
      storage()?.setItem(KEY, JSON.stringify(s))
    } catch {
      // Storage blocked: the count lives for this session only.
    }
  }

  return {
    remaining: (kind) => Math.max(0, read()[kind].lockedUntil - now()),
    fails: (kind) => read()[kind].fails,
    fail(kind, fingerprint) {
      if (lastWrong[kind] === fingerprint) return false
      lastWrong[kind] = fingerprint
      const s = read()
      const fails = s[kind].fails + 1
      const wait = waitAfter(fails)
      s[kind] = { fails, lockedUntil: wait ? now() + wait : 0 }
      write(s)
      return true
    },
    succeed() {
      lastWrong.passphrase = lastWrong.code = undefined
      write(empty())
    },
  }
}

/** The one limiter of this device. */
export const unlockLimiter = createLimiter()

const salt = crypto.getRandomValues(new Uint8Array(16))

/** A salted SHA-256 of the typed value, kept in memory only to spot a repeat. */
export async function fingerprint(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.normalize('NFKC'))
  const all = new Uint8Array(salt.length + bytes.length)
  all.set(salt)
  all.set(bytes, salt.length)
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', all))
  return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** "4:32" for a wait in ms (rounded up to the second). */
export function clock(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
