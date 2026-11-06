/**
 * How ⌫ behaves while it is held (pure, tested). A tap deletes one
 * character. Holding: nothing for 0.4 s, then a character every 80 ms, every
 * 40 ms after 1 s, and after 1.5 s a whole word at a time (every 120 ms).
 */
export const REPEAT_AFTER_MS = 400

export interface BackspaceStep {
  unit: 'char' | 'word'
  /** Wait this long (ms) before the next delete. */
  next: number
}

export function backspaceStep(heldMs: number): BackspaceStep {
  if (heldMs >= 1500) return { unit: 'word', next: 120 }
  if (heldMs >= 1000) return { unit: 'char', next: 40 }
  return { unit: 'char', next: 80 }
}
