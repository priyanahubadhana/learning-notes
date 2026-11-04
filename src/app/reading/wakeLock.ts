/**
 * Keeps the screen awake while reading (the Screen Wake Lock API, free and
 * in Safari 16.4 and later). It is let go when Reading mode ends, and asked
 * for again when the app comes back to the screen (the browser drops it
 * whenever the app is hidden). Returns a function that lets go.
 */
export function lockIdle(on: boolean): (() => void) | undefined {
  if (!on || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    return undefined
  }
  let sentinel: WakeLockSentinel | null = null
  let stopped = false
  const request = async () => {
    try {
      const next = await navigator.wakeLock.request('screen')
      if (stopped) void next.release()
      else sentinel = next
    } catch {
      // Refused (low battery, not allowed): reading works without it.
    }
  }
  const onVisible = () => {
    if (
      document.visibilityState === 'visible' &&
      (!sentinel || sentinel.released)
    ) {
      void request()
    }
  }
  void request()
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    stopped = true
    document.removeEventListener('visibilitychange', onVisible)
    void sentinel?.release()
  }
}
