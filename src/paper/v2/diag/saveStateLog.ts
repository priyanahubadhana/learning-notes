import { hasUnsaved, onUnsavedChange } from '../../../app/saveStatus'
import { watchWindowPassive } from '../../../app/input/windowRecorder'
import { KEEP } from './diagStore'

/** One "Not saved yet" moment (BUG-001). Kinds, times and numbers only. */
export type SaveEntry = {
  /** ms since the page opened */
  t: number
  state: 'unsaved' | 'saved'
  /** The kind of the block being edited (a name like "checkListItem"), never its text. */
  blockKind: string
  online: boolean
  /** Name of the last error seen in the 3 s before (e.g. "QuotaExceededError"), or "-". */
  error: string
  /** ms since the last tap or key, or -1 */
  sinceInput: number
}

/** The block kind around the caret or the last tap; the name only. */
export function blockKindOf(el: Element | null | undefined): string {
  const c = el?.closest?.('[data-content-type]')
  return c?.getAttribute('data-content-type') ?? '-'
}

/** The last error name, if it is recent. */
export function recentError(
  last: { name: string; t: number } | null,
  now: number,
  windowMs = 3000,
): string {
  return last && now - last.t <= windowMs ? last.name : '-'
}

const nameOf = (v: unknown): string => (v instanceof Error ? v.name : 'unknown')

/** Starts logging. Newest first. Returns the stop function. */
export function startSaveStateLog(
  initial: SaveEntry[],
  onRows: (rows: SaveEntry[]) => void,
): () => void {
  let rows = initial
  let last: { name: string; t: number } | null = null
  let lastInput = -1
  let prev = hasUnsaved()
  const now = () => Math.round(performance.now())
  const stopSave = onUnsavedChange(() => {
    const cur = hasUnsaved()
    if (cur === prev) return
    prev = cur
    rows = [
      {
        t: now(),
        state: cur ? ('unsaved' as const) : ('saved' as const),
        blockKind: blockKindOf(document.activeElement),
        online: navigator.onLine,
        error: recentError(last, now()),
        sinceInput: lastInput < 0 ? -1 : now() - lastInput,
      },
      ...rows,
    ].slice(0, KEEP)
    onRows(rows)
  })
  const stopErr = watchWindowPassive(['error', 'unhandledrejection'], (e) => {
    const x = e as ErrorEvent & PromiseRejectionEvent
    last = { name: nameOf(x.error ?? x.reason), t: now() }
  })
  const stopInput = watchWindowPassive(['keydown', 'pointerdown'], () => {
    lastInput = now()
  })
  return () => {
    stopSave()
    stopErr()
    stopInput()
  }
}
