import { memStore } from '../../app/tools/store'
import type { PadStroke } from './pressure'

/**
 * The universal Undo / Redo while the Write pad is open (R7-20, R7-21): one
 * list of steps, in the order they happened, across the pad and the page.
 *
 * - "pad" steps change only the pad: typing, a key, Clear, the mode switch
 *   (Scribble / AI), pen strokes, erasing, an AI Read result.
 * - "apply" steps are Insert / Replace / Done: the text moved from the pad to
 *   the page. Undo takes it off the page AND puts it back in the pad; Redo
 *   inserts it again.
 * - "page" steps are page edits made while the pad is open (typing on the
 *   page, drawing). Undo and Redo hand these to the page's own history
 *   (ProseMirror + ink), so the order stays right.
 *
 * Quick typing within 600 ms is one step. When the pad closes the list is
 * dropped and Undo goes back to the page alone.
 */

export interface PadSnap {
  text: string
  mode: 'scribble' | 'ai'
  strokes: readonly PadStroke[]
}

type Kind = 'pad' | 'apply' | 'page'
interface Step {
  kind: Kind
  before: PadSnap
  after: PadSnap
  at: number
  typing: boolean
}

const MERGE_MS = 600
const LIMIT = 200
const EMPTY: PadSnap = { text: '', mode: 'scribble', strokes: [] }

let steps: Step[] = []
/** Steps [0, done) are done; the rest can be redone. */
let done = 0
let current: PadSnap = EMPTY
let put: ((snap: PadSnap) => void) | null = null
let runPage: ((kind: 'undo' | 'redo') => boolean) | null = null
/** > 0 while the history itself (or an Insert) is changing the page. */
let quiet = 0

export const padHistoryState = memStore({ canUndo: false, canRedo: false })

function publish(): void {
  const next = { canUndo: done > 0, canRedo: done < steps.length }
  const old = padHistoryState.get()
  if (old.canUndo !== next.canUndo || old.canRedo !== next.canRedo)
    padHistoryState.set(next)
}

/** True while a change to the page should not be written down as a step. */
export const isQuiet = (): boolean => quiet > 0

/** Runs a change to the page (Insert, a page Undo) that is not a new step. */
export function quietly<T>(fn: () => T): T {
  quiet++
  try {
    return fn()
  } finally {
    quiet--
  }
}

/**
 * The pad says how to put a snapshot back, and how to run the page's own
 * Undo / Redo. Unbinding clears the list.
 */
export function bindPadHistory(
  putSnap: ((snap: PadSnap) => void) | null,
  page: ((kind: 'undo' | 'redo') => boolean) | null = null,
): void {
  put = putSnap
  runPage = page
  if (!putSnap) resetPadHistory(EMPTY)
}

/** True when the pad is open and its list is in use. */
export const padHistoryBound = (): boolean => put !== null

/** Starts again from this state (opening, closing, another page). */
export function resetPadHistory(snap: PadSnap | string): void {
  steps = []
  done = 0
  current = typeof snap === 'string' ? { ...EMPTY, text: snap } : snap
  publish()
}

const same = (a: PadSnap, b: PadSnap): boolean =>
  a.text === b.text && a.mode === b.mode && a.strokes === b.strokes

function push(step: Step): void {
  steps.length = done
  steps.push(step)
  if (steps.length > LIMIT) steps.shift()
  done = steps.length
  current = step.after
  publish()
}

/**
 * The pad changed. `typing` steps within 600 ms merge into one; everything
 * else (a key, Clear, a stroke, a mode switch) is its own step.
 */
export function recordPad(
  next: PadSnap,
  opts: { now?: number; typing?: boolean } = {},
): void {
  if (same(next, current)) return
  const now = opts.now ?? Date.now()
  const typing = !!opts.typing
  const last = steps[steps.length - 1]
  if (
    typing &&
    last &&
    done === steps.length &&
    last.kind === 'pad' &&
    last.typing &&
    now - last.at <= MERGE_MS
  ) {
    last.after = next
    last.at = now
    current = next
    publish()
    return
  }
  push({ kind: 'pad', before: current, after: next, at: now, typing })
}

/** Insert / Replace / Done: the text moved to the page (already done). */
export function recordApply(next: PadSnap): void {
  push({
    kind: 'apply',
    before: current,
    after: next,
    at: Date.now(),
    typing: false,
  })
}

/** The page changed on its own while the pad is open. */
export function recordPage(): void {
  push({
    kind: 'page',
    before: current,
    after: current,
    at: Date.now(),
    typing: false,
  })
}

/** The latest step is undone (false: nothing left in the list). */
export function undoPad(): boolean {
  while (done > 0) {
    const step = steps[--done]
    if (step.kind === 'pad') {
      current = step.before
      put?.(step.before)
      publish()
      return true
    }
    const ran = quietly(() => runPage?.('undo') ?? false)
    if (step.kind === 'apply') {
      current = step.before
      put?.(step.before)
      publish()
      return true
    }
    if (ran) {
      publish()
      return true
    }
  }
  publish()
  return false
}

export function redoPad(): boolean {
  while (done < steps.length) {
    const step = steps[done++]
    if (step.kind === 'pad') {
      current = step.after
      put?.(step.after)
      publish()
      return true
    }
    const ran = quietly(() => runPage?.('redo') ?? false)
    if (step.kind === 'apply') {
      current = step.after
      put?.(step.after)
      publish()
      return true
    }
    if (ran) {
      publish()
      return true
    }
  }
  publish()
  return false
}
