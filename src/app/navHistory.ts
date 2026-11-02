import { useSyncExternalStore } from 'react'

/**
 * Where we are in the app's Back / Forward list, so the ← → buttons know
 * when they can act: browsers don't tell a page if there is a next entry.
 * Each history entry remembers its number; the list's end is kept for the
 * tab's life, so a reload doesn't lose it.
 */
const LAST_KEY = 'learning-notes:nav-last'

let position = 0
let last = 0
const listeners = new Set<() => void>()

function entryNumber(): number | null {
  const number = (history.state as { nav?: unknown } | null)?.nav
  return typeof number === 'number' ? number : null
}

function setPosition(next: number, end: number) {
  position = next
  last = end
  try {
    sessionStorage.setItem(LAST_KEY, String(end))
  } catch {
    // Blocked storage: ← → still work until the next reload.
  }
  listeners.forEach((listener) => listener())
}

function readLast(): number {
  try {
    return Number(sessionStorage.getItem(LAST_KEY)) || 0
  } catch {
    return 0
  }
}

/** Numbers the entry the app opened on and follows Back / Forward. */
export function startNavHistory() {
  const opened = entryNumber()
  if (opened === null) {
    history.replaceState({ nav: 0 }, '')
    setPosition(0, 0)
  } else {
    setPosition(opened, Math.max(opened, readLast()))
  }
  window.addEventListener('popstate', () => {
    const number = entryNumber()
    if (number !== null) {
      setPosition(number, Math.max(last, number))
      return
    }
    // A plain link added this entry: it is new, and nothing is ahead of it.
    history.replaceState({ nav: position + 1 }, '')
    setPosition(position + 1, position + 1)
  })
}

/** Adds a history entry; anything ahead of it is gone, as in a browser. */
export function pushEntry(url: string) {
  history.pushState({ nav: position + 1 }, '', url)
  setPosition(position + 1, position + 1)
}

/** Changes the address of the current entry. */
export function replaceEntry(url: string) {
  history.replaceState({ nav: position }, '', url)
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export const useCanGoBack = () =>
  useSyncExternalStore(subscribe, () => position > 0)

export const useCanGoForward = () =>
  useSyncExternalStore(subscribe, () => position < last)
