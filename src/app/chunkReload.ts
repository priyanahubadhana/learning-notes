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
 * offline used to do this) or when the page is already being left (the
 * leaving aborts the download, and a reload then cancels where the person
 * was going).
 */
export function reloadCanHelp(online: boolean, leaving: boolean): boolean {
  return online && !leaving
}

/** Reloads once when Vite reports a screen's file could not be loaded. */
export function reloadOnFailedChunk(): void {
  let leaving = false
  window.addEventListener('beforeunload', () => {
    leaving = true
    // A cancelled leave: the page stays, so a later failure may reload again.
    setTimeout(() => (leaving = false), 5000)
  })
  window.addEventListener('pagehide', () => (leaving = true))
  window.addEventListener('pageshow', () => (leaving = false))
  window.addEventListener('vite:preloadError', (event) => {
    if (!reloadCanHelp(navigator.onLine, leaving)) return
    if (!shouldReload(sessionStorage, Date.now())) return
    event.preventDefault() // the reload replaces the failed screen
    location.reload()
  })
}
