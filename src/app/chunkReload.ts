/**
 * A screen's file can fail to download: the connection dropped, or a new
 * version replaced it while this window stayed on the old one. One reload
 * usually fixes both. It happens at most once per `WINDOW_MS`, so a file
 * that keeps failing reaches the error screen instead of a reload loop.
 */
const KEY = 'learning-notes:chunkReload'
const WINDOW_MS = 30_000

type SessionStore = Pick<Storage, 'getItem' | 'setItem'>

/** True if a reload should be tried now (and records that it was). */
export function shouldReload(storage: SessionStore, now: number): boolean {
  try {
    const last = Number(storage.getItem(KEY)) || 0
    if (now - last < WINDOW_MS) return false
    storage.setItem(KEY, String(now))
    return true
  } catch {
    return false // no memory of earlier tries: a reload could repeat forever
  }
}

/**
 * A reload cannot help, and would do harm, when the device is offline (it
 * swaps the open notes for an error page; a background prefetch that failed
 * offline used to do this).
 */
export function reloadCanHelp(online: boolean): boolean {
  return online
}

/**
 * The reload waits a moment: when the page is being left, the leaving itself
 * aborts the download, and an instant reload of the old address would cancel
 * where the person was going. A page that is gone never runs the timer.
 */
export const RELOAD_DELAY_MS = 1000

/** Reloads once when Vite reports a screen's file could not be loaded. */
export function reloadOnFailedChunk(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (!reloadCanHelp(navigator.onLine)) return
    if (!shouldReload(sessionStorage, Date.now())) return
    event.preventDefault() // the reload replaces the failed screen
    setTimeout(() => location.reload(), RELOAD_DELAY_MS)
  })
}
