/**
 * One editor per page: two windows editing the same page would overwrite
 * each other, because each saves what it shows. The browser's Web Locks give
 * the page to one window; the others show it read-only with "Edit here",
 * which takes the page over. Locks end by themselves when a window closes.
 * Browsers without Web Locks simply edit, as before.
 */
export type LockState = 'mine' | 'elsewhere'

/** The part of the browser's `navigator.locks` used here. */
export interface LockManagerLike {
  request: (
    name: string,
    options: { ifAvailable?: boolean; steal?: boolean },
    callback: (lock: unknown) => Promise<void> | void,
  ) => Promise<unknown>
}

export interface PageLock {
  /** Takes the page from the other window. */
  takeOver: () => void
  /** Lets the page go (it was closed here). */
  release: () => void
}

/** A page just closed here can take a moment to let go of its lock. */
const TRIES = 4
const TRY_GAP_MS = 150

export function holdPageLock(
  pageId: string,
  onChange: (state: LockState) => void,
  locks: LockManagerLike | undefined = navigator.locks,
): PageLock {
  const name = `learning-notes:page:${pageId}`
  let closed = false
  let held = false
  let letGo = () => {}
  let timer: ReturnType<typeof setTimeout> | undefined

  const hold = (
    options: { ifAvailable?: boolean; steal?: boolean },
    tries = 0,
  ) => {
    locks
      ?.request(name, options, (lock) => {
        if (closed) return
        if (!lock) {
          if (tries + 1 < TRIES) {
            timer = setTimeout(() => hold(options, tries + 1), TRY_GAP_MS)
          } else {
            onChange('elsewhere')
          }
          return
        }
        held = true
        onChange('mine')
        return new Promise<void>((resolve) => {
          letGo = resolve
        })
      })
      .catch(() => {
        // Taken by another window. Any failure before we ever held it means
        // locks do not work here: editing as before is the safe choice.
        if (closed) return
        const wasHeld = held
        held = false
        onChange(wasHeld ? 'elsewhere' : 'mine')
      })
  }

  if (locks) hold({ ifAvailable: true })
  else onChange('mine')

  return {
    takeOver: () => hold({ steal: true }),
    release: () => {
      closed = true
      clearTimeout(timer)
      letGo()
    },
  }
}
