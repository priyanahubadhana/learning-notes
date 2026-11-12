import { memStore } from '../../app/tools/store'

/**
 * Reader lock modes (slice 7d, RD-B15 to RD-B23, RD-P01). A comfort lock to
 * stop accidental taps, not security. The mode is kept per book (on the book
 * record, `Page.readLockMode`); a new book opens in the last mode used.
 */
export type LockMode = 'all' | 'reading' | 'view' | 'frozen'

export const LOCK_MODES: readonly LockMode[] = [
  'all',
  'reading',
  'view',
  'frozen',
]

export const isLockMode = (v: unknown): v is LockMode =>
  typeof v === 'string' && (LOCK_MODES as readonly string[]).includes(v)

/** What a person may try to do while reading. */
export type LockAction =
  /** Pen, highlighter, eraser, lasso, Undo / Redo of ink. */
  | 'draw'
  /** Put a sticky note down, move it, edit it. */
  | 'sticky'
  /** Select text to highlight, make a note, make a card. */
  | 'highlight'
  /** Edit the words of an existing note. */
  | 'editNote'
  | 'bookmark'
  | 'listen'

const ALLOWED: Record<LockMode, ReadonlySet<LockAction>> = {
  all: new Set<LockAction>([
    'draw',
    'sticky',
    'highlight',
    'editNote',
    'bookmark',
    'listen',
  ]),
  reading: new Set<LockAction>(['highlight', 'editNote', 'bookmark', 'listen']),
  view: new Set<LockAction>(),
  frozen: new Set<LockAction>(),
}

/** Does this mode allow the action? Zoom, scroll, page turns, Find and Aa always work (Frozen: only swipes turn pages). */
export const lockAllows = (mode: LockMode, action: LockAction): boolean =>
  ALLOWED[mode].has(action)

/** View only and Frozen: hold the padlock to leave. */
export const isStrong = (mode: LockMode): boolean =>
  mode === 'view' || mode === 'frozen'

/** The modes the padlock menu lists. Frozen only with its Professional switch. */
export const visibleModes = (frozenOn: boolean): LockMode[] =>
  LOCK_MODES.filter((m) => m !== 'frozen' || frozenOn)

/**
 * The mode a book opens in: its own, else the last one used on any book,
 * else Everything works. Frozen without its switch behaves as View only (the
 * data stays; the feature is just not offered).
 */
export function resolveMode(
  own: LockMode | undefined,
  last: LockMode | undefined,
  frozenOn: boolean,
): LockMode {
  const m = own ?? last ?? 'all'
  return m === 'frozen' && !frozenOn ? 'view' : m
}

/** The mode of the book now open (kept in step by the reader; 'all' when no reader is open). */
export const activeLock = memStore<LockMode>('all')
/** Counts the taps the lock turned away; the padlock shakes on each. */
export const lockNudge = memStore<number>(0)

/**
 * True (and the padlock shakes) when the active mode turns the action away.
 * The caller shows the "Unlock to use this" toast.
 */
export function lockBlocked(action: LockAction): boolean {
  if (lockAllows(activeLock.get(), action)) return false
  lockNudge.set(lockNudge.get() + 1)
  return true
}
