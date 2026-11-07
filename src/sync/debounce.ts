/**
 * Runs `fn` once `wait` ms after the last call, but never later than
 * `maxWait` ms after the first call of a burst (so a long typing session
 * still syncs now and then). Used to send local edits to sync.
 */
export function debounceMax(
  fn: () => void,
  wait: number,
  maxWait: number,
): { call: () => void; cancel: () => void } {
  let quiet: ReturnType<typeof setTimeout> | null = null
  let limit: ReturnType<typeof setTimeout> | null = null
  const run = () => {
    cancel()
    fn()
  }
  function cancel() {
    if (quiet) clearTimeout(quiet)
    if (limit) clearTimeout(limit)
    quiet = limit = null
  }
  return {
    call() {
      if (quiet) clearTimeout(quiet)
      quiet = setTimeout(run, wait)
      limit ??= setTimeout(run, maxWait)
    },
    cancel,
  }
}
