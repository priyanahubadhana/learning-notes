/**
 * Fetch likely next chunks quietly once the first screen is up and the
 * browser is idle, so the first tap on them is instant. A failed fetch is
 * ignored (the real use retries). Saves no data: the service worker
 * already keeps every chunk, this just warms the browser's own copy.
 *
 * One chunk per idle slice, and none while the page is hidden, so loading
 * them never competes with a tap, a stroke or a scroll.
 */
export function prefetchAfterIdle(loaders: Array<() => Promise<unknown>>) {
  const queue = [...loaders]
  const idle = (fn: () => void, timeout: number) => {
    if ('requestIdleCallback' in window)
      window.requestIdleCallback(fn, { timeout })
    else setTimeout(fn, 1000)
  }
  const next = () => {
    if (queue.length === 0) return
    if (document.visibilityState === 'hidden') {
      document.addEventListener('visibilitychange', next, { once: true })
      return
    }
    const load = queue.shift()!
    void load()
      .catch(() => {})
      .then(() => idle(next, 8000))
  }
  const start = () => idle(next, 8000)
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}
