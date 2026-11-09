import { onGestureReset, registerToolState } from '../app/gestureReset'
import { editableIn, onModeApplied, pageMode } from './editPolicy'

/**
 * One owner of the page's `contenteditable` while a gesture runs (tools
 * robustness, step 3).
 *
 * A Lasso or handle gesture, a Pencil text drag and a grip drag each make
 * the page non-editable for the length of the gesture (iPadOS Scribble then
 * has nothing to write in). They used to remember the attribute's old value
 * and write it back later; with two of them at once, or a tool change in
 * between, one wrote back the other's stale `false`, and Text, tap-select
 * and Pencil select all stopped without an error.
 *
 * Now they only `lock(owner, el)` and `unlock(owner)`. The value that comes
 * back is never remembered from before: the page editor follows the page
 * mode (`editableIn(pageMode)`, one source of truth), and any other element
 * gets what it had when the FIRST lock took it (restored when the LAST
 * lock lets go). The watchdog clears every lock.
 */

interface Held {
  count: number
  /** For an element that is not the page editor: what it had at the first lock. */
  was: string | null
}

const held = new Map<HTMLElement, Held>()
const owners = new Map<string, HTMLElement>()

/** The page's text editor follows the page mode. */
const isPageEditor = (el: HTMLElement) =>
  el.hasAttribute('data-page-content') || el.classList.contains('bn-editor')

function valueFor(el: HTMLElement, h?: Held): string | null {
  if (isPageEditor(el)) return editableIn(pageMode.get()) ? 'true' : 'false'
  return h?.was ?? null
}

function write(el: HTMLElement, value: string | null) {
  if (value === null) el.removeAttribute('contenteditable')
  else if (el.getAttribute('contenteditable') !== value) {
    el.setAttribute('contenteditable', value)
  }
}

/** `owner` makes `el` non-editable until it calls `unlock(owner)`. */
export function lock(owner: string, el: HTMLElement): void {
  unlock(owner)
  const h = held.get(el) ?? {
    count: 0,
    was: el.getAttribute('contenteditable'),
  }
  h.count++
  held.set(el, h)
  owners.set(owner, el)
  write(el, 'false')
}

/** Lets go of the owner's lock; the last lock on an element puts it right. */
export function unlock(owner: string): void {
  const el = owners.get(owner)
  if (!el) return
  owners.delete(owner)
  const h = held.get(el)
  if (!h) return
  h.count--
  if (h.count > 0) return
  held.delete(el)
  write(el, valueFor(el, h))
}

/** Lets go of every lock (the watchdog, the health check). */
export function clearLocks(): void {
  for (const owner of [...owners.keys()]) unlock(owner)
}

/**
 * The page mode was applied again (a tool change): the browser or the editor
 * may have written `contenteditable` meanwhile. Locked elements stay locked;
 * the rest follows the mode.
 */
export function reapplyLocks(): void {
  for (const el of held.keys()) write(el, 'false')
}

export const lockCount = (): number => owners.size

/** Locked page-editor elements whose attribute does not say `false` (a bug if any). */
export function brokenLocks(): number {
  let n = 0
  for (const el of held.keys()) {
    if (el.getAttribute('contenteditable') !== 'false') n++
  }
  return n
}

/** Tests only. */
export function resetEditLocksForTests(): void {
  held.clear()
  owners.clear()
}

onModeApplied(reapplyLocks)
// The app switch: a gesture that cannot finish must not keep the page read-only.
onGestureReset(() => clearLocks())
registerToolState('editLock', () => ({
  owners: [...owners.keys()],
  locked: held.size,
}))
