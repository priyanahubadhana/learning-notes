/** Pure rules of the Tool frame (S3-03 to S3-09), unit-tested without a screen. */

export type CloseAction = 'close' | 'ask' | 'stop' | 'none'

/**
 * What ✕ / Esc does: clean = close at once; dirty = ask "Discard changes?";
 * busy with a Stop = stop the job (no half result); busy without one = nothing
 * (closing never leaves a half result).
 */
export function closeAction(s: {
  dirty: boolean
  busy: boolean
  canStop: boolean
}): CloseAction {
  if (s.busy) return s.canStop ? 'stop' : 'none'
  return s.dirty ? 'ask' : 'close'
}

/**
 * How many tools fit before "…" (S3-09). `widths` are the natural widths of
 * each tool button. When all fit there is no "…"; otherwise room is left for it.
 * `max` caps the row (5 on a phone).
 */
export function visibleToolCount(
  widths: readonly number[],
  avail: number,
  gap: number,
  moreWidth: number,
  max = Infinity,
): number {
  const n = widths.length
  const cap = Math.min(n, max)
  const need = (count: number, more: boolean) => {
    let w = 0
    for (let i = 0; i < count; i++) w += widths[i] + (i > 0 ? gap : 0)
    return more ? w + (count > 0 ? gap : 0) + moreWidth : w
  }
  if (cap === n && need(n, false) <= avail) return n
  for (let c = cap; c > 0; c--) {
    if (c === n) continue
    if (need(c, true) <= avail) return c
  }
  return 0
}

/** The 25 / 50 / 75 / 100 % mark newly passed, or null (busy progress is announced only at these). */
export function progressMark(pct: number, last: number): number | null {
  const p = Math.max(0, Math.min(100, pct))
  for (const m of [100, 75, 50, 25]) if (p >= m && last < m) return m
  return null
}

/** True when Enter / Ctrl+Z should be left to the field the person is typing in. */
export function isTypingTarget(el: EventTarget | null): boolean {
  const e = el as HTMLElement | null
  if (!e?.tagName) return false
  if (e.isContentEditable) return true
  const tag = e.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}
