import type { Rect } from './place'

export interface Toast {
  message: string
  /** Overrides the queue default; 0 or less means it stays until dismissed. */
  timeoutMs?: number
}

export interface ToastItem extends Toast {
  id: number
}

export function createToastQueue({
  max = 3,
  timeoutMs = 4000,
}: { max?: number; timeoutMs?: number } = {}) {
  let nextId = 1
  let shown: ToastItem[] = []
  let queued: ToastItem[] = []
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  const subs = new Set<() => void>()
  const emit = () => subs.forEach((f) => f())

  function show(t: ToastItem) {
    shown.push(t)
    const ms = t.timeoutMs ?? timeoutMs
    if (ms > 0)
      timers.set(
        t.id,
        setTimeout(() => dismiss(t.id), ms),
      )
  }

  function dismiss(id: number) {
    const wasQueued = queued.length
    queued = queued.filter((t) => t.id !== id)
    const before = shown.length
    shown = shown.filter((t) => t.id !== id)
    const timer = timers.get(id)
    if (timer !== undefined) clearTimeout(timer)
    timers.delete(id)
    if (shown.length === before && queued.length === wasQueued) return
    while (shown.length < max && queued.length) show(queued.shift()!)
    emit()
  }

  return {
    push(t: Toast): number {
      const item = { ...t, id: nextId++ }
      if (shown.length < max) show(item)
      else queued.push(item)
      emit()
      return item.id
    },
    dismiss,
    visible: (): readonly ToastItem[] => shown,
    waiting: (): readonly ToastItem[] => queued,
    subscribe(cb: () => void): () => void {
      subs.add(cb)
      return () => subs.delete(cb)
    },
  }
}

export type ToastQueue = ReturnType<typeof createToastQueue>

const hit = (a: Rect, b: Rect) =>
  a.left < b.left + b.width &&
  a.left + a.width > b.left &&
  a.top < b.top + b.height &&
  a.top + a.height > b.top

/**
 * Tops for a bottom-up stack of toasts (first = nearest the bottom edge), none covering an `avoid` rect.
 * Each toast is `width` wide, centred, `gap` apart; a toast that would cover a rect moves above it.
 */
export function stackPositions(
  heights: number[],
  viewport: { width: number; height: number },
  avoid: Rect[],
  opts: { width?: number; margin?: number; gap?: number } = {},
): number[] {
  const { width = 320, margin = 8, gap = 8 } = opts
  const left = Math.max(margin, (viewport.width - width) / 2)
  const tops: number[] = []
  let bottom = viewport.height - margin
  for (const h of heights) {
    let top = bottom - h
    for (let moved = true; moved;) {
      moved = false
      for (const r of avoid) {
        if (hit({ left, top, width, height: h }, r)) {
          top = r.top - gap - h
          moved = true
        }
      }
    }
    tops.push(top)
    bottom = top - gap
  }
  return tops
}
