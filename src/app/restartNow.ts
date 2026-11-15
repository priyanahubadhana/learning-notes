// An update restart that always finishes (T27). While a new worker is still
// installing or waiting, the old files are NOT dropped (the browser queues
// that behind the install, so no reload would come): wait for the worker,
// activate it, reload. The last-resort path gets at most FALLBACK_MAX_MS for
// unregister and cache clear, then reloads anyway.

export const FALLBACK_MAX_MS = 1500
export const WORKER_WAIT_MAX_MS = 60_000

export interface WorkerLike {
  state: string
  onstatechange: ((ev: Event) => unknown) | null
  postMessage(message: unknown): void
}

export interface RegistrationLike {
  installing?: WorkerLike | null
  waiting?: WorkerLike | null
}

export interface RestartDeps {
  getRegistration: () => Promise<RegistrationLike | undefined>
  /** Unregisters the workers and deletes the saved copies. */
  clearOld: () => Promise<void>
  reload: () => void
  after: (run: () => void, ms: number) => unknown
}

/** Resolves with the promise, or after `ms` (never rejects). */
function within<T>(
  d: RestartDeps,
  p: Promise<T>,
  ms: number,
): Promise<T | undefined> {
  return new Promise((resolve) => {
    d.after(() => resolve(undefined), ms)
    p.then(resolve, () => resolve(undefined))
  })
}

/** Waits until the worker is active (or has failed); asks it to take over. */
function finish(d: RestartDeps, w: WorkerLike): Promise<boolean> {
  return new Promise((resolve) => {
    let asked = false
    const look = () => {
      if (w.state === 'installed' && !asked) {
        asked = true
        w.postMessage({ type: 'SKIP_WAITING' })
      }
      if (w.state === 'activated' || w.state === 'redundant') resolve(true)
    }
    w.onstatechange = look
    d.after(() => resolve(false), WORKER_WAIT_MAX_MS)
    look()
  })
}

export async function restartIntoNewFiles(d: RestartDeps): Promise<void> {
  let done = false
  const reload = () => {
    if (done) return
    done = true
    d.reload()
  }
  try {
    const reg = await within(d, d.getRegistration(), FALLBACK_MAX_MS)
    const w = reg?.installing ?? reg?.waiting
    if (w && (await finish(d, w))) return reload()
    await within(d, d.clearOld(), FALLBACK_MAX_MS)
  } catch {
    // Restart anyway.
  }
  reload()
}

/** The real browser parts. */
export function browserRestartDeps(): RestartDeps {
  return {
    getRegistration: async () =>
      (await navigator.serviceWorker?.getRegistration()) ?? undefined,
    clearOld: async () => {
      const regs = (await navigator.serviceWorker?.getRegistrations()) ?? []
      await Promise.all(regs.map((r) => r.unregister()))
      for (const key of (await caches?.keys()) ?? []) await caches.delete(key)
    },
    reload: () => location.reload(),
    after: (run, ms) => window.setTimeout(run, ms),
  }
}
