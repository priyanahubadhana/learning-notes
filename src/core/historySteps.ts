import Dexie from 'dexie'
import { memStore } from '../app/tools/store'

/**
 * The one Undo / Redo of a page: the small API every action uses.
 *
 * - `pushStep` writes one undoable step down (with how to undo and redo it).
 * - `group` makes everything done inside it one step (a drag, a paste).
 * - `transaction` is a group that is taken back if it throws.
 * - `undo` / `redo` are what every Undo button calls.
 *
 * Database writes to pages, tags, databases and the like need no call at
 * all: `rowCapture.ts` (same folder) records them from the database itself, so a new
 * action cannot forget. This file stays tiny (it is in the first download);
 * the journal itself (`pageHistory.ts`) loads in the background and calls
 * made before it arrives wait in a queue, in order.
 */

export interface StepInput {
  /** Short words for the toast ("Moved box"). */
  label: string
  /** What it changed: 'ink', 'pm', 'rows', 'box', 'picture' ... */
  kind: string
  /** Normally the open page; set for a step of another scope. */
  scope?: string
  /** Steps with the same key within 800 ms of each other become one. */
  merge?: string
  /** Undo / Redo of this session (not kept over a reload). */
  undo?: () => unknown
  redo?: () => unknown
  /** What the closures belong to (a text editor, the ink): its steps go when it does. */
  owner?: unknown
  /** Saved over a reload; `kind` must be registered (`registerKind`). */
  data?: unknown
}

export interface HistoryState {
  canUndo: boolean
  canRedo: boolean
}

/** What the Undo / Redo buttons read. */
export const historyState = memStore<HistoryState>({
  canUndo: false,
  canRedo: false,
})

type Impl = typeof import('../history/pageHistory')
let impl: Impl | null = null
let loading: Promise<void> | null = null
const queue: Array<(m: Impl) => void> = []

function load(): Promise<void> {
  return (loading ??= import('../history/pageHistory').then((m) => {
    impl = m
    for (const fn of queue.splice(0)) fn(m)
  }))
}

function run(fn: (m: Impl) => void): void {
  if (impl) fn(impl)
  else {
    queue.push(fn)
    void load()
  }
}

/** Loads the journal in the background (called once, when idle). */
export const preloadHistory = (): Promise<void> => load()

let groupSeq = 0
let group_: { id: number; label: string } | null = null
let quiet = 0

/** The group a write now belongs to (0: none). */
export const currentGroup = (): { id: number; label: string } | null => group_

/** True while Undo / Redo itself (or a restore) is changing things. */
export const isQuiet = (): boolean => quiet > 0

/** Runs a change that must not become a step (Undo itself, a restore). */
export function quietly<T>(fn: () => T): T {
  quiet++
  try {
    return fn()
  } finally {
    quiet--
  }
}

const quietTrans = new WeakSet<object>()

/**
 * Call first thing inside a database transaction: its writes are not steps
 * (the editor's own autosave, an automatic repair). Only that transaction is
 * quiet, so a person's action at the same moment is still recorded.
 */
export function quietTx(): void {
  const tx = Dexie.currentTransaction
  if (tx) quietTrans.add(tx)
}

/** Is this transaction quiet (see quietTx)? */
export const isQuietTx = (tx: unknown): boolean =>
  !!tx && quietTrans.has(tx as object)

/** Like quietly, for work that waits (database writes). */
export async function quietAsync<T>(fn: () => Promise<T> | T): Promise<T> {
  quiet++
  try {
    return await fn()
  } finally {
    quiet--
  }
}

export function pushStep(step: StepInput): void {
  if (quiet > 0) return
  const g = group_
  run((m) => m.push(step, g))
}

/** Everything written inside `fn` (even later, if it returns a promise) is one step. */
export function group<T>(label: string, fn: () => T): T {
  const outer = group_
  const mine = outer ?? { id: ++groupSeq, label }
  group_ = mine
  const end = () => {
    group_ = outer
    if (!outer) run((m) => m.endGroup(mine.id))
  }
  let result: T
  try {
    result = fn()
  } catch (e) {
    end()
    throw e
  }
  if (result && typeof (result as { then?: unknown }).then === 'function') {
    // The group stays open until the promise is done, so later writes of the
    // same action join it.
    void Promise.resolve(result).then(end, end)
    return result
  }
  end()
  return result
}

/** A group that is taken back (undone and forgotten) when it throws. */
export async function transaction<T>(
  label: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  let id = 0
  try {
    return await group(label, () => {
      id = group_?.id ?? 0
      return fn()
    })
  } catch (e) {
    run((m) => m.rollbackGroup(id))
    throw e
  }
}

/** Which page (or database) Undo works on; null: none (no page open). */
export function setActiveScope(scope: string | null): void {
  run((m) => m.setActive(scope))
}

export function undo(): Promise<boolean> {
  return new Promise((resolve) => run((m) => resolve(m.undo())))
}

export function redo(): Promise<boolean> {
  return new Promise((resolve) => run((m) => resolve(m.redo())))
}

/**
 * Undo for a toast's button: takes the newest step back only if it was made
 * at or after `since` (the action the toast is about). False: something
 * newer happened (the caller then undoes the action its own way).
 */
export function undoSince(since: number): Promise<boolean> {
  return new Promise((resolve) => run((m) => resolve(m.undoSince(since))))
}

/** Forgets the newest step when it is of this kind (a tap taken back). */
export function dropLast(kind: string): void {
  run((m) => m.dropLast(kind))
}

/** Makes the newest two steps one (a delete of ink and text together). */
export function chainLast(): void {
  run((m) => m.chainLast())
}

/** Forgets the steps of something that went away (an editor, the ink). */
export function releaseOwner(owner: unknown): void {
  run((m) => m.release(owner))
}

/** Tells the journal how to undo a saved kind of step. */
export function registerKind(
  kind: string,
  handler: { undo: (data: never) => unknown; redo: (data: never) => unknown },
): void {
  run((m) => m.registerKind(kind, handler as never))
}

/** Lets the journal watch a text editor (one per box). Returns detach. */
export function attachEditor(editor: unknown, boxId: string): () => void {
  let off: (() => void) | null = null
  let gone = false
  run((m) => {
    if (!gone) off = m.attachEditor(editor as never, boxId)
  })
  return () => {
    gone = true
    off?.()
  }
}

let reloader: (() => void) | null = null
/** The open page tells how to redraw itself from the database (after a restore). */
export function setPageReloader(fn: () => void): () => void {
  reloader = fn
  return () => {
    if (reloader === fn) reloader = null
  }
}
export const reloadPage = (): void => reloader?.()
