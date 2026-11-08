/**
 * A new version of the app has been downloaded and waits for the user's OK.
 * The offer is repeated whenever the app comes back to the front, because a
 * message can be missed and an iPad may keep the app open for weeks. Closing
 * the offer hides it until the next app start.
 */
type Listener = (apply: () => void) => void

let pending: (() => void) | undefined
const listeners = new Set<Listener>()
let dismissed = false

/** Called once the new version is ready; `apply` restarts into it. */
export function offerUpdate(apply: () => void) {
  pending = apply
  for (const fn of [...listeners]) fn(apply)
}

/** Listens for offers, including one made before the app had started. */
export function onUpdateOffer(next: Listener): () => void {
  listeners.add(next)
  if (pending) next(pending)
  return () => {
    listeners.delete(next)
  }
}

/** Repeats a waiting offer, unless the user closed it. */
export function repeatUpdateOffer() {
  if (pending && !dismissed) for (const fn of [...listeners]) fn(pending)
}

/** The user closed the offer: not shown again until the next app start. */
export function dismissUpdateOffer() {
  dismissed = true
}

/**
 * Runs `check` now and each time the app comes to the front. Now matters: a
 * fresh start sends no "came to the front" event, and an iPad may otherwise
 * not look until the next page change.
 */
export function watchForUpdates(
  page: {
    visibilityState: string
    addEventListener: (type: 'visibilitychange', run: () => void) => void
  },
  check: () => void,
) {
  check()
  page.addEventListener('visibilitychange', () => {
    if (page.visibilityState === 'visible') check()
  })
}

/** Back to no offer and no listener (for tests). */
export function resetUpdates() {
  pending = undefined
  listeners.clear()
  dismissed = false
}

// ---- "Check for updates now" (Settings › About this app) ----

type Check = () => Promise<void>
let checker: Check | undefined
let lastChecked: number | null = null
const checkedListeners = new Set<() => void>()

/** Remembers how to ask the browser for a new version (main.tsx). */
export function setUpdateChecker(check: Check) {
  checker = check
}
/** A check ran (by the app or by the user). */
export function noteChecked(at = Date.now()) {
  lastChecked = at
  for (const fn of checkedListeners) fn()
}
export const lastCheckedAt = (): number | null => lastChecked
export function onChecked(fn: () => void): () => void {
  checkedListeners.add(fn)
  return () => {
    checkedListeners.delete(fn)
  }
}
export const updateWaiting = (): boolean => pending !== undefined

/** Asks for a new version now. 'ready' = one waits, 'current' = up to date. */
export async function checkForUpdateNow(
  wait = 2500,
): Promise<'ready' | 'current' | 'failed'> {
  if (!checker) return 'failed'
  try {
    await checker()
    // A new version needs a moment to download before it is "waiting".
    await new Promise((r) => setTimeout(r, wait))
    noteChecked()
    if (pending) {
      dismissed = false
      for (const fn of [...listeners]) fn(pending)
    }
    return pending ? 'ready' : 'current'
  } catch {
    return 'failed'
  }
}

// ---- A clean restart when the new version takes over (R7-1) ----

/** The part of `navigator.serviceWorker` used here. */
export interface ServiceWorkerLike {
  controller: unknown
  addEventListener: (type: 'controllerchange', run: () => void) => void
}

/** How long to wait (ms) for a safe moment before restarting anyway. */
export const SAFE_RELOAD_MAX_MS = 20_000
const SAFE_RELOAD_POLL_MS = 250

/**
 * Restarts the page at a safe moment: the app is showing, no pointer is down
 * and nothing is unsaved. After `maxWait` it restarts anyway, so an old page
 * can never keep running against a new version's files.
 */
export function reloadWhenSafe(
  safe: () => boolean,
  reload: () => void,
  timers: {
    setTimeout: (run: () => void, ms: number) => unknown
    now: () => number
  } = { setTimeout: (run, ms) => window.setTimeout(run, ms), now: Date.now },
  maxWait = SAFE_RELOAD_MAX_MS,
): void {
  const started = timers.now()
  const tick = () => {
    if (safe() || timers.now() - started >= maxWait) reload()
    else timers.setTimeout(tick, SAFE_RELOAD_POLL_MS)
  }
  tick()
}

/**
 * When a NEW service worker takes control of a page that was already
 * controlled by an old one, this page is now the old version running on the
 * new version's files: its late-loaded chunks may be gone or mismatched
 * (the owner's "Update, then the Pen is dead", R7-1). That happens when
 * another window or the installed app pressed Update, or when the reload
 * the Update button asks for was missed. The page restarts cleanly instead.
 * The very first install (no controller before) is not an update.
 */
export function watchControllerChange(
  sw: ServiceWorkerLike | undefined,
  restart: () => void,
): void {
  if (!sw) return
  let had = !!sw.controller
  sw.addEventListener('controllerchange', () => {
    const was = had
    had = true
    if (was) restart()
  })
}

// ---- More triggers for looking (R6-14) ----

/** At most one extra look per 5 minutes, and one every 10 while visible. */
export const UPDATE_THROTTLE_MS = 5 * 60_000
export const UPDATE_EVERY_MS = 10 * 60_000

/** Wraps `run` so it goes at most once per `gap` ms; returns whether it ran. */
export function throttled(
  run: () => void,
  gap = UPDATE_THROTTLE_MS,
  now: () => number = Date.now,
): () => boolean {
  let last = -Infinity
  return () => {
    const at = now()
    if (at - last < gap) return false
    last = at
    run()
    return true
  }
}

interface TriggerWindow {
  addEventListener: (type: string, run: () => void, options?: object) => void
  document: { visibilityState: string }
  setInterval: (run: () => void, ms: number) => unknown
}

/**
 * Looks for a new version on page navigation, on the first typing or touch
 * after a pause, and every 10 minutes while the app is showing. Never
 * reloads: a found version only raises the usual "Update available" offer,
 * which App applies only when nothing is unsaved.
 */
export function watchUpdateTriggers(
  win: TriggerWindow,
  check: () => void,
  now: () => number = Date.now,
) {
  const soft = throttled(check, UPDATE_THROTTLE_MS, now)
  win.addEventListener('hashchange', soft)
  win.addEventListener('keydown', soft, { capture: true, passive: true })
  win.addEventListener('pointerdown', soft, { capture: true, passive: true })
  win.setInterval(() => {
    if (win.document.visibilityState === 'visible') soft()
  }, UPDATE_EVERY_MS)
}
