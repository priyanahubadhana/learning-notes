/**
 * The Drive pass lifecycle (fix #4): one place decides when the pass is
 * renewed. It is renewed a few minutes BEFORE it runs out (quietly), several
 * callers share one renewal, a refused quiet renewal keeps a still-valid
 * pass, and a pass the server refused (401) can be dropped so the next call
 * renews it. No vendor code here: the renewal itself is passed in.
 */

export interface Pass {
  token: string
  /** ms: when Google stops accepting the token. */
  expiresAt: number
}

/** Renew this long before the pass runs out. */
export const RENEW_AHEAD_MS = 5 * 60_000

export interface DrivePassOptions {
  get(): Pass | undefined
  set(p: Pass | undefined): void
  /** Asks Google for a new pass; null = it needs a tap (or failed). */
  renew(interactive: boolean): Promise<Pass | null>
  now?(): number
}

export function createDrivePass(o: DrivePassOptions) {
  const now = o.now ?? Date.now
  let inflight: Promise<string | null> | null = null

  const run = async (interactive: boolean): Promise<string | null> => {
    const old = o.get()
    const fresh = await o.renew(interactive).catch(() => null)
    if (fresh) {
      o.set(fresh)
      return fresh.token
    }
    // Quiet renewal refused: a pass that still works is kept until it ends.
    return old && old.expiresAt > now() ? old.token : null
  }

  return {
    async token(interactive: boolean): Promise<string | null> {
      const p = o.get()
      if (p && p.expiresAt - now() > RENEW_AHEAD_MS) return p.token
      if (inflight) {
        const shared = await inflight
        if (shared || !interactive) return shared
      }
      const mine = run(interactive)
      inflight = mine
      try {
        return await mine
      } finally {
        if (inflight === mine) inflight = null
      }
    },
    /** The server refused the pass: forget it so the next call renews. */
    drop(): void {
      o.set(undefined)
    },
  }
}
