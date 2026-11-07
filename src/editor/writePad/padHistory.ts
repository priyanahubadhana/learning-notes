import { memStore } from '../../app/tools/store'

/**
 * The Write pad's own Undo history (the main bar ↶ ↷ use it while the pad
 * holds unsent text). Whole-text snapshots: typing, Scribble input and the
 * ␣ ↵ ⌫ keys all change the text, so one list covers them. Quick typing
 * within 600 ms is one step. Once text is inserted the history is cleared and
 * Undo goes back to the page.
 */

const MERGE_MS = 600
const LIMIT = 200

let past: string[] = []
let future: string[] = []
let current = ''
let lastAt = 0
let setter: ((text: string) => void) | null = null

export const padHistoryState = memStore({ canUndo: false, canRedo: false })

function publish(): void {
  const next = { canUndo: past.length > 0, canRedo: future.length > 0 }
  const old = padHistoryState.get()
  if (old.canUndo !== next.canUndo || old.canRedo !== next.canRedo)
    padHistoryState.set(next)
}

/** The pad tells the history how to put a text back into the box. */
export function bindPadHistory(put: ((text: string) => void) | null): void {
  setter = put
  if (!put) resetPadHistory('')
}

/** Starts again from this text (after Insert, Clear, closing). */
export function resetPadHistory(text: string): void {
  past = []
  future = []
  current = text
  lastAt = 0
  publish()
}

/** The text changed by the user (typing, Scribble, a key). */
export function recordPadText(
  next: string,
  now = Date.now(),
  ownStep = false,
): void {
  if (next === current) return
  if (ownStep || now - lastAt > MERGE_MS || past.length === 0) {
    past.push(current)
    if (past.length > LIMIT) past.shift()
  }
  lastAt = ownStep ? 0 : now
  current = next
  future = []
  publish()
}

export function undoPad(): boolean {
  const back = past.pop()
  if (back === undefined) return false
  future.push(current)
  current = back
  lastAt = 0
  setter?.(back)
  publish()
  return true
}

export function redoPad(): boolean {
  const next = future.pop()
  if (next === undefined) return false
  past.push(current)
  current = next
  lastAt = 0
  setter?.(next)
  publish()
  return true
}
