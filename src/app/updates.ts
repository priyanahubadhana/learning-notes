/**
 * A new version of the app has been downloaded and waits for the user's OK.
 * The offer is repeated whenever the app comes back to the front, because a
 * message can be missed and an iPad may keep the app open for weeks. Closing
 * the offer hides it until the next app start.
 */
type Listener = (apply: () => void) => void

let pending: (() => void) | undefined
let listener: Listener | undefined
let dismissed = false

/** Called once the new version is ready; `apply` restarts into it. */
export function offerUpdate(apply: () => void) {
  pending = apply
  listener?.(apply)
}

/** Listens for offers, including one made before the app had started. */
export function onUpdateOffer(next: Listener): () => void {
  listener = next
  if (pending) next(pending)
  return () => {
    if (listener === next) listener = undefined
  }
}

/** Repeats a waiting offer, unless the user closed it. */
export function repeatUpdateOffer() {
  if (pending && !dismissed) listener?.(pending)
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
  listener = undefined
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
      listener?.(pending)
    }
    return pending ? 'ready' : 'current'
  } catch {
    return 'failed'
  }
}
