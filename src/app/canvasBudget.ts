/**
 * Canvas memory budget. iOS draws canvases blank once their total memory
 * passes about 384 MB, so every big canvas (ink layers, later PDF pages)
 * asks here first and gives its bytes back when it is dropped.
 */
export const BUDGET_BYTES = 160 * 1024 * 1024
export const MAX_DPR = 2

const held = new Map<string, number>()

/** Bytes of a canvas of this size (4 bytes per pixel). */
export const canvasBytes = (w: number, h: number): number =>
  Math.ceil(w) * Math.ceil(h) * 4

export const usedBytes = (): number => {
  let n = 0
  for (const b of held.values()) n += b
  return n
}

/** Takes (or resizes) `id`'s share. False when it would not fit. */
export function reserve(id: string, bytes: number): boolean {
  const others = usedBytes() - (held.get(id) ?? 0)
  if (others + bytes > BUDGET_BYTES) return false
  held.set(id, bytes)
  return true
}

export function release(id: string): void {
  held.delete(id)
}

export const clampDpr = (dpr: number): number =>
  Math.max(1, Math.min(MAX_DPR, dpr || 1))

/** Tests only. */
export const resetBudget = (): void => held.clear()
