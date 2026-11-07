/**
 * Fetch likely next chunks quietly once the first screen is up and the
 * browser is idle, so the first tap on them is instant. A failed fetch is
 * ignored (the real use retries). Saves no data: the service worker
 * already keeps every chunk, this just warms the browser's own copy.
 */
export function prefetchAfterIdle(loaders: Array<() => Promise<unknown>>) {
  const run = () => {
    for (const load of loaders) void load().catch(() => {})
  }
  const start = () => {
    if ('requestIdleCallback' in window)
      window.requestIdleCallback(run, { timeout: 8000 })
    else setTimeout(run, 3000)
  }
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}
