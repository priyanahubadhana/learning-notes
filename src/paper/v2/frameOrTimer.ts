/**
 * Runs `fn` on the next animation frame, or after FRAME_FALLBACK_MS if no
 * frame has come by then (a page that is not painting: a hidden tab, the CI's
 * headless WebKit). Once, whichever is first. Why: a Pencil move that waits
 * only for a frame is not drawn while the page paints nothing, and shows up
 * late, when the next event wakes the page (C21, CI run 45565136359: the box
 * changed by 40 px after a lost lift, at the first hover).
 */
export const FRAME_FALLBACK_MS = 40

const live = new Map<number, { raf: number; timer: number }>()
let seq = 0

export function frameOrTimer(fn: () => void): number {
  const id = ++seq
  const run = () => {
    if (!live.has(id)) return
    cancelFrameOrTimer(id)
    fn()
  }
  live.set(id, {
    raf: requestAnimationFrame(run),
    timer: setTimeout(run, FRAME_FALLBACK_MS) as unknown as number,
  })
  return id
}

export function cancelFrameOrTimer(id: number): void {
  const e = live.get(id)
  if (!e) return
  live.delete(id)
  cancelAnimationFrame(e.raf)
  clearTimeout(e.timer)
}
