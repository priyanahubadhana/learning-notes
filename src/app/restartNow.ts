// An update restart that always finishes (T27). While a new worker is still
// installing or waiting, the old files are NOT dropped (the browser queues
// that behind the install, so no reload would come): wait for the worker,
// activate it, reload. The last-resort path gets at most FALLBACK_MAX_MS for
// unregister and cache clear, then reloads anyway.

import { updateStatus } from './updateStatus'

export const FALLBACK_MAX_MS = 1500
export const WORKER_WAIT_MAX_MS = 15_000
/** After this long the notice offers "Restart now" (C22). */
export const SLOW_AFTER_MS = 5000
/** A reload that has not taken the page away by now is asked again (C22). */
export const WATCHDOG_MS = 4000

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
  /** Saves what is typed; called before every reload (data safety). */
  flush: () => Promise<void>
  reload: () => void
  /** A reload to a fresh address, for when the plain reload was ignored. */
  reloadFresh: () => void
  /** Tells the screen: waiting too long, or could not restart (null: fine). */
  report?: (state: 'slow' | 'failed' | null) => void
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
    skipWait = () => resolve(false)
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

let running = false
let skipWait: (() => void) | null = null
let retry: (() => void) | null = null
/** True from the start of a restart until the page reloads. */
export const restartRunning = (): boolean => running

/** Tests only: forget a restart that was left running. */
export function resetRestartForTests(): void {
  running = false
  skipWait = null
  retry = null
}

/** "Restart now" / "Tap to try again": stops the waiting, or starts again. */
export function pressRestart(): void {
  if (running) skipWait?.()
  else retry?.()
}

export async function restartIntoNewFiles(d: RestartDeps): Promise<void> {
  if (running) return
  running = true
  retry = () => void restartIntoNewFiles(d)
  d.report?.(null)
  // Waiting is never silent: after a few seconds the person can restart now.
  d.after(() => {
    if (running) d.report?.('slow')
  }, SLOW_AFTER_MS)
  const reload = async () => {
    await within(d, d.flush(), FALLBACK_MAX_MS)
    d.reload()
    // Still here after a while: the reload was ignored. Save again, ask with
    // a fresh address; a second miss is shown, never silent.
    d.after(async () => {
      await within(d, d.flush(), FALLBACK_MAX_MS)
      d.reloadFresh()
      d.after(() => {
        running = false
        d.report?.('failed')
      }, WATCHDOG_MS)
    }, WATCHDOG_MS)
  }
  try {
    const reg = await within(d, d.getRegistration(), FALLBACK_MAX_MS)
    const w = reg?.installing ?? reg?.waiting
    if (w && (await finish(d, w))) return await reload()
    await within(d, d.clearOld(), FALLBACK_MAX_MS)
  } catch {
    // Restart anyway.
  }
  await reload()
}

/** Tests: `window.__lnIgnoreReload = true` makes a reload do nothing (C22). */
const ignoredByTest = (): boolean =>
  !!(window as unknown as { __lnIgnoreReload?: boolean }).__lnIgnoreReload

/** The real browser parts. */
export function browserRestartDeps(flush: () => Promise<void>): RestartDeps {
  return {
    flush,
    getRegistration: async () =>
      (await navigator.serviceWorker?.getRegistration()) ?? undefined,
    clearOld: async () => {
      const regs = (await navigator.serviceWorker?.getRegistrations()) ?? []
      await Promise.all(regs.map((r) => r.unregister()))
      for (const key of (await caches?.keys()) ?? []) await caches.delete(key)
    },
    reload: () => !ignoredByTest() && location.reload(),
    reloadFresh: () => {
      const u = new URL(location.href)
      u.searchParams.set('_r', String(Date.now()))
      if (!ignoredByTest()) location.replace(u.href)
    },
    report: (state) =>
      updateStatus.set(
        state ? { phase: 'updating', restart: state } : { phase: 'updating' },
      ),
    after: (run, ms) => window.setTimeout(run, ms),
  }
}
