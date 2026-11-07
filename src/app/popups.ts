import { useEffect, useRef } from 'react'

/**
 * One rule for every pop-up, menu and tray (More, the ⋯ menus, the colour
 * picker, the ribbon's tools, the theme list …). A pop-up stays open only
 * until the user chooses something, OR taps or clicks anywhere outside it,
 * OR switches ribbon tab or opens another pop-up, OR presses Esc, OR
 * navigates or scrolls the page. Only one pop-up is open at a time.
 *
 * Every pop-up calls `usePopup` while it is open; nothing else is needed.
 * Choosing something is the pop-up's own job: it calls its `close`.
 * A button that opens a pop-up carries `data-popup-trigger`: a press on it
 * is inside the pop-up's world, so the button can toggle it by itself.
 */

interface Entry {
  close: () => void
  /** True for an element that belongs to this pop-up. */
  inside: (target: Element) => boolean
  /** The pop-up whose surface this one was opened from (it stays open). */
  parent: Entry | null
}

/** Open pop-ups, oldest first. Normally there is at most one. */
const open: Entry[] = []

/** Closes every open pop-up (used when a different one opens). */
export function closeAllPopups(except?: Entry): void {
  for (const entry of [...open]) if (entry !== except) entry.close()
}

/** The pop-up this element is in, or in a pop-up opened from it, and so on. */
function owns(entry: Entry, target: Element): boolean {
  if (entry.inside(target)) return true
  return open.some((child) => child.parent === entry && owns(child, target))
}

/** How many pop-ups are open (tests and the rule check). */
export const openPopupCount = () => open.length

/** Is `a` the parent, grandparent … of `b`? */
function isAncestor(a: Entry, b: Entry | null): boolean {
  for (let at = b; at; at = at.parent) if (at === a) return true
  return false
}

/**
 * When the user last did something that scrolls (wheel, finger move, a scroll
 * key). A scroll the page makes by itself (a bar changing size, the keyboard
 * opening) is not the user scrolling and does not close a pop-up.
 */
let userScrollAt = 0
const USER_SCROLL_MS = 1200
const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
])

/** When a pop-up last opened (a scroll just after it is the page settling). */
let lastOpened = 0

/** Scrolling a moment after opening is the page settling, not the user. */
export const SCROLL_GRACE_MS = 400

/** True if `target` is inside an element matching one of the selectors. */
export const insideAny =
  (...selectors: string[]) =>
  (target: Element): boolean =>
    selectors.some((s) => target.closest(s) !== null)

export function usePopup(
  isOpen: boolean,
  close: () => void,
  /** True for an element that belongs to the pop-up (its own panel, trigger). */
  inside: (target: Element) => boolean,
  options: {
    /** Called after Esc closed it (e.g. to give the focus back). */
    onEscape?: () => void
    /** Scrolling the page does not close it (default: it does). */
    keepOnScroll?: boolean
    /**
     * The button that opened it. A pop-up opened from inside another one (the
     * theme list in the ribbon's tools) does not close that one: it belongs to it.
     */
    opener?: Element | null
  } = {},
): void {
  const latest = useRef({ close, inside, options })
  useEffect(() => {
    latest.current = { close, inside, options }
  })

  useEffect(() => {
    if (!isOpen) return
    lastOpened = Date.now()
    const opener = latest.current.options.opener ?? null
    const parent =
      (opener && open.find((e) => e.inside(opener) || owns(e, opener))) || null
    const entry: Entry = {
      close: () => latest.current.close(),
      inside: (target) => latest.current.inside(target),
      parent,
    }
    // Everything open closes, except the pop-up this one was opened from.
    for (const other of [...open]) {
      if (other !== parent && !isAncestor(other, parent)) other.close()
    }
    open.push(entry)

    const isInside = (target: EventTarget | null) =>
      target instanceof Element &&
      (owns(entry, target) || target.closest('[data-popup-trigger]'))
    const onDown = (e: Event) => {
      if (!isInside(e.target)) entry.close()
    }
    const onKey = (e: KeyboardEvent) => {
      // Only the newest pop-up answers Esc.
      if (e.key !== 'Escape' || open[open.length - 1] !== entry) return
      entry.close()
      latest.current.options.onEscape?.()
    }
    const onScroll = (e: Event) => {
      if (latest.current.options.keepOnScroll) return
      // Right after any pop-up opened (it can move the focus and the page).
      if (Date.now() - lastOpened < SCROLL_GRACE_MS) return
      if (isInside(e.target)) return
      if (Date.now() - userScrollAt > USER_SCROLL_MS) return
      entry.close()
    }
    const onUserScroll = () => {
      userScrollAt = Date.now()
    }
    const onScrollKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) userScrollAt = Date.now()
    }
    const onNavigate = () => entry.close()
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    document.addEventListener('scroll', onScroll, true)
    document.addEventListener('wheel', onUserScroll, true)
    document.addEventListener('touchmove', onUserScroll, true)
    document.addEventListener('keydown', onScrollKey, true)
    window.addEventListener('hashchange', onNavigate)
    window.addEventListener('popstate', onNavigate)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('wheel', onUserScroll, true)
      document.removeEventListener('touchmove', onUserScroll, true)
      document.removeEventListener('keydown', onScrollKey, true)
      window.removeEventListener('hashchange', onNavigate)
      window.removeEventListener('popstate', onNavigate)
      const at = open.indexOf(entry)
      if (at >= 0) open.splice(at, 1)
    }
  }, [isOpen])
}

/** BlockNote's own pop-ups live next to the editor, not in it. */
export const isEditorPopup = (el: Element): boolean =>
  el.closest('.bn-container') !== null && el.closest('.bn-editor') === null
