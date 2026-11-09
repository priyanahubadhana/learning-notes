import { flushAllSaves, hasPendingSaves } from '../editor/autosave'
import { registerToolState, resetGestures } from './gestureReset'
import { inputMachine } from './inputMachine'
import { activeTool, isModeTool } from './tools/main/mainTools'
import { hasUnsaved } from './saveStatus'
import { reloadWhenSafe } from './updates'

/**
 * Soft refresh (tools robustness, step 6): the last resort when a tool is
 * stuck in a way the health check could not heal, and the "Refresh app" row
 * in the settings menu. It saves everything, remembers the page, the scroll
 * and the tool, and reloads; on start the place is put back (once, and only
 * if it is less than a minute old).
 *
 * The automatic one waits for a safe moment (the machine is idle, no text
 * composition, no open sheet with typed input, every save written) with the
 * safe-reload poll the updates use, and happens at most once every 10
 * minutes. After it, a toast says "App refreshed to fix a stuck tool".
 */

const KEY = 'ln.softRefresh'
const LAST_KEY = 'ln.softRefresh.auto'

/** Automatic soft refreshes are at least this far apart (ms). */
export const AUTO_CAP_MS = 10 * 60_000
/** A remembered place older than this (ms) is not used. */
export const RESTORE_MAX_AGE_MS = 60_000
/** How long (ms) the automatic one waits for a safe moment before giving up. */
const SAFE_WAIT_MS = 20_000
/** The saves get this long (ms) before the reload goes ahead anyway. */
const FLUSH_MS = 4000

export interface Place {
  hash: string
  pageId: string | null
  top: number
  tool: string
  at: number
  auto: boolean
}

/** May an automatic refresh happen now? (Pure.) */
export const autoAllowed = (now: number, last: number | null): boolean =>
  last === null || now - last >= AUTO_CAP_MS || now < last

/** Is a remembered place fresh enough to use? (Pure.) */
export const placeFresh = (p: Pick<Place, 'at'>, now: number): boolean =>
  now - p.at >= 0 && now - p.at < RESTORE_MAX_AGE_MS

let composing = false
let installed = false
let memoryLast: number | null = null
let pendingAuto = false

function installComposition(win: Window = window) {
  if (installed) return
  installed = true
  win.addEventListener('compositionstart', () => (composing = true), true)
  win.addEventListener('compositionend', () => (composing = false), true)
}

const DIALOG = '[role="dialog"],[role="alertdialog"],[aria-modal="true"]'

/** Does an open sheet or dialog hold something typed that is not sent? */
export function sheetHasInput(doc: Document = document): boolean {
  for (const d of Array.from(doc.querySelectorAll(DIALOG))) {
    for (const f of Array.from(
      d.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'textarea, input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit])',
      ),
    )) {
      if (f.value.trim() !== '') return true
    }
  }
  return false
}

/** A safe moment: nothing half-done, nothing unsaved. */
export function safeNow(doc: Document = document): boolean {
  return (
    doc.visibilityState === 'visible' &&
    inputMachine.state() === 'idle' &&
    !composing &&
    !sheetHasInput(doc) &&
    !hasPendingSaves() &&
    !hasUnsaved()
  )
}

const readLast = (): number | null => {
  try {
    const raw = sessionStorage.getItem(LAST_KEY)
    const n = raw === null ? NaN : Number(raw)
    return Number.isFinite(n) ? n : memoryLast
  } catch {
    return memoryLast
  }
}

const writeLast = (at: number) => {
  memoryLast = at
  try {
    sessionStorage.setItem(LAST_KEY, String(at))
  } catch {
    // Private mode: the cap lasts until this page ends.
  }
}

/** Saves the notes, the ink and anything waiting (never longer than FLUSH_MS). */
async function saveEverything(): Promise<void> {
  const all = Promise.all([
    flushAllSaves().catch(() => {}),
    import('../ink/inkDoc').then((m) => m.flushAllInk()).catch(() => {}),
  ])
  await Promise.race([all, new Promise((r) => setTimeout(r, FLUSH_MS))])
}

function remember(auto: boolean) {
  const scroller = document.querySelector<HTMLElement>('[data-page-scroller]')
  let pageId: string | null
  try {
    pageId = JSON.parse(
      localStorage.getItem('learning-notes:currentPage') ?? 'null',
    ) as string | null
  } catch {
    pageId = null
  }
  const place: Place = {
    hash: location.hash,
    pageId: typeof pageId === 'string' ? pageId : null,
    top: scroller?.scrollTop ?? 0,
    tool: activeTool.get(),
    at: Date.now(),
    auto,
  }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(place))
  } catch {
    // Private mode: the app still opens the page it had.
  }
}

async function reloadNow(auto: boolean): Promise<void> {
  await saveEverything()
  remember(auto)
  location.reload()
}

/** "Refresh app": at once. Everything is saved first. */
export function refreshNow(): void {
  resetGestures('manual')
  void reloadNow(false)
}

/**
 * The health check could not heal something: refresh, at a safe moment, at
 * most once every AUTO_CAP_MS. Returns false when it was not started.
 */
export function requestSoftRefresh(
  why: string,
  now: () => number = Date.now,
): boolean {
  installComposition()
  if (pendingAuto || !autoAllowed(now(), readLast())) return false
  pendingAuto = true
  writeLast(now())
  console.warn('Soft refresh:', why)
  reloadWhenSafe(
    () => safeNow(),
    () => {
      pendingAuto = false
      if (safeNow()) void reloadNow(true)
    },
    undefined,
    SAFE_WAIT_MS,
  )
  return true
}

/**
 * On start: puts the page's scroll and the tool back once, if the refresh was
 * less than a minute ago. Returns 'auto' when the toast is due, 'manual' for
 * a refresh the person asked for, null when this was not a refresh.
 */
export function restoreSoftRefresh(): 'auto' | 'manual' | null {
  let saved: Place | undefined
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    saved = raw ? (JSON.parse(raw) as Place) : undefined
  } catch {
    return null
  }
  if (!saved || typeof saved.top !== 'number') return null
  if (!placeFresh(saved, Date.now())) return null
  const { top, hash, tool } = saved
  if (hash === location.hash) {
    let tries = 0
    let toolDone = false
    const stop = () => {
      tries = 99
    }
    window.addEventListener('wheel', stop, { once: true, passive: true })
    window.addEventListener('pointerdown', stop, { once: true, passive: true })
    const step = () => {
      const el = document.querySelector<HTMLElement>('[data-page-scroller]')
      if (el && tries < 40) {
        if (!toolDone && typeof tool === 'string' && isModeTool(tool)) {
          activeTool.set(tool)
          toolDone = true
        }
        if (top > 0 && el.scrollHeight - el.clientHeight >= top - 1) {
          el.scrollTop = top
          if (Math.abs(el.scrollTop - top) <= 1) tries += 10
        } else if (top <= 0) {
          tries += 10
        }
      }
      if (++tries < 40) setTimeout(step, 100)
    }
    step()
  }
  return saved.auto ? 'auto' : 'manual'
}

registerToolState('softRefresh', () => {
  const last = readLast()
  return {
    pendingAuto,
    lastAutoAgoS: last === null ? null : Math.round((Date.now() - last) / 1000),
    capMin: AUTO_CAP_MS / 60_000,
  }
})

/** Tests only. */
export function resetSoftRefreshForTests(): void {
  memoryLast = null
  pendingAuto = false
  composing = false
}
