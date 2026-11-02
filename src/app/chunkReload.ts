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

/** Reloads once when Vite reports a screen's file could not be loaded. */
export function reloadOnFailedChunk(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (!shouldReload(sessionStorage, Date.now())) return
    event.preventDefault() // the reload replaces the failed screen
    location.reload()
  })
}
