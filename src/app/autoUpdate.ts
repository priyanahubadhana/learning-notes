/**
 * Automatic updates. When a new version is found, the app applies it by
 * itself at a safe moment (no tap needed): nothing waiting to be saved, no
 * pen or finger down, no Write pad draft, no dialog open, and the app either
 * just came back to the front or has paused for about 1.5 seconds (no IME
 * composition either). Any input also triggers a throttled version check
 * (updates.ts); the "Updating…" splash shows for a moment. Saves
 * are flushed and the silent backup (R7-2) is taken first. The person is
 * asked only when an update could lose data (no backup, low space, changes
 * that would not save).
 */
import { memStore } from './tools/store'
import { t } from '../i18n/t'

/** The first pause (no key, touch or pen) after which an update may apply. */
export const IDLE_MS = 1500
/** Right after coming to the front, with nothing touched yet. */
export const FOREGROUND_MS = 1500
export const POLL_MS = 500

/** What the app is doing right now. */
export interface Moment {
  visible: boolean
  /** Ms since the last key, touch or pen movement. */
  idleMs: number
  /** Ms since the app came to the front; Infinity once touched since. */
  sinceForeground: number
  penDown: boolean
  fingerDown: boolean
  /** Changes waiting to be written (a failed save is handled later). */
  pendingSave: boolean
  /** A Write pad draft is mid-entry. */
  padDraft: boolean
  dialogOpen: boolean
  /** An IME composition is open (optional: false when unknown). */
  composing?: boolean
}

/** True when an update may be applied now. */
export function isSafeMoment(m: Moment): boolean {
  if (!m.visible || m.penDown || m.fingerDown) return false
  if (m.pendingSave || m.padDraft || m.dialogOpen || m.composing) return false
  return m.idleMs >= IDLE_MS || m.sinceForeground <= FOREGROUND_MS
}

/** Why an update was held back and the person is asked. */
export type UpdateRisk =
  { kind: 'unsaved' } | { kind: 'backup'; reason: 'space' | 'error' }

export interface PrepareDeps {
  flush: () => Promise<void>
  /** A save has failed and is still waiting. */
  hasUnsaved: () => boolean
  backup: () => Promise<'ok' | 'space' | 'error'>
}

/** Flushes saves and takes the backup; returns a risk, or null when safe. */
export async function prepareUpdate(
  d: PrepareDeps,
): Promise<UpdateRisk | null> {
  try {
    await d.flush()
  } catch {
    // The saver reports its own failure; hasUnsaved below sees it.
  }
  if (d.hasUnsaved()) return { kind: 'unsaved' }
  let backup: 'ok' | 'space' | 'error'
  try {
    backup = await d.backup()
  } catch {
    backup = 'error'
  }
  return backup === 'ok' ? null : { kind: 'backup', reason: backup }
}

/**
 * Resolves when `read()` says the moment is safe. Looks again every
 * `POLL_MS`. `cancel` stops it (the promise then never resolves).
 */
export function waitForSafeMoment(
  read: () => Moment,
  after: (run: () => void, ms: number) => unknown = (run, ms) =>
    setTimeout(run, ms),
): { done: Promise<void>; cancel: () => void } {
  let stopped = false
  const done = new Promise<void>((resolve) => {
    const tick = () => {
      if (stopped) return
      if (isSafeMoment(read())) resolve()
      else after(tick, POLL_MS)
    }
    tick()
  })
  return { done, cancel: () => (stopped = true) }
}

/** The question shown when an update could lose data (App draws it). */
export const updateRisk = memStore<{
  risk: UpdateRisk
  apply: () => void
} | null>(null)

// ---- Keeping the place across the restart ----

const KEY = 'ln.updated'

/** Remembers the page and scroll, and that the toast is due. */
export function rememberPlace(): void {
  try {
    const scroller = document.querySelector('[data-page-scroller]')
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        hash: location.hash,
        top: scroller?.scrollTop ?? 0,
      }),
    )
  } catch {
    // Private mode: the page is kept by the app anyway.
  }
}

/**
 * After a restart by an update: puts the scroll back and returns true when
 * the "Updated" toast is due. The scroll waits for the page to be tall
 * enough, and stops at once if the person scrolls first.
 */
export function restoreAfterUpdate(): boolean {
  let saved: { hash: string; top: number } | undefined
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    saved = raw ? JSON.parse(raw) : undefined
  } catch {
    return false
  }
  if (!saved || typeof saved.top !== 'number') return false
  const { top, hash } = saved
  if (top > 0 && hash === location.hash) {
    let tries = 0
    const stop = () => {
      tries = 99
    }
    window.addEventListener('wheel', stop, { once: true, passive: true })
    window.addEventListener('pointerdown', stop, { once: true, passive: true })
    const step = () => {
      const el = document.querySelector<HTMLElement>('[data-page-scroller]')
      if (el && tries < 40) {
        if (el.scrollHeight - el.clientHeight >= top - 1) {
          el.scrollTop = top
          if (Math.abs(el.scrollTop - top) <= 1) tries += 10
        }
      }
      if (++tries < 40) setTimeout(step, 100)
    }
    step()
  }
  return true
}

// ---- The browser side ----

export interface AutoUpdateDeps {
  enabled: () => boolean
  now?: () => number
  win: Window
  /** Page-side facts. */
  penDown: () => boolean
  hasPendingSaves: () => boolean
  hasUnsaved: () => boolean
  padDraft: () => boolean
  flush: () => Promise<void>
  backup: () => Promise<'ok' | 'space' | 'error'>
  onReset: (fn: () => void) => void
}

const DIALOG = '[role="dialog"],[role="alertdialog"],[aria-modal="true"]'

/** Starts watching; returns `offer(apply)` for each found version. */
export function startAutoUpdate(d: AutoUpdateDeps) {
  const now = d.now ?? Date.now
  const doc = d.win.document
  let lastActivity = now()
  let foregroundAt = lastActivity
  let touchedSince = false
  const down = new Set<number>()
  let running = false
  let declined = false
  let composing = false
  d.win.addEventListener('compositionstart', () => (composing = true), true)
  d.win.addEventListener('compositionend', () => (composing = false), true)

  const activity = () => {
    lastActivity = now()
    touchedSince = true
  }
  for (const type of ['keydown', 'pointermove', 'wheel', 'touchstart'])
    d.win.addEventListener(type, activity, { capture: true, passive: true })
  d.win.addEventListener(
    'pointerdown',
    (e) => {
      activity()
      down.add((e as PointerEvent).pointerId)
    },
    { capture: true, passive: true },
  )
  for (const type of ['pointerup', 'pointercancel'])
    d.win.addEventListener(
      type,
      (e) => {
        down.delete((e as PointerEvent).pointerId)
        lastActivity = now()
      },
      { capture: true, passive: true },
    )
  d.onReset(() => down.clear())
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'visible') {
      foregroundAt = now()
      touchedSince = false
    }
  })

  const read = (): Moment => ({
    visible: doc.visibilityState === 'visible',
    idleMs: now() - lastActivity,
    sinceForeground: touchedSince ? Infinity : now() - foregroundAt,
    penDown: d.penDown(),
    fingerDown: down.size > 0,
    // A failed save is not "about to be saved": it is handled as a risk.
    pendingSave: d.hasPendingSaves() && !d.hasUnsaved(),
    padDraft: d.padDraft(),
    dialogOpen: !!doc.querySelector(DIALOG),
    composing,
  })

  /** A found version: applies it when the setting is on. */
  return async function offer(apply: () => void): Promise<void> {
    if (running || declined || !d.enabled()) return
    running = true
    try {
      let risk: UpdateRisk | null
      do {
        await waitForSafeMoment(read).done
        if (!d.enabled()) return
        risk = await prepareUpdate({
          flush: d.flush,
          hasUnsaved: d.hasUnsaved,
          backup: d.backup,
        })
        // The person may have started typing while the backup ran.
      } while (!risk && !isSafeMoment(read()))
      if (risk) {
        updateRisk.set({
          risk,
          apply: () => {
            updateRisk.set(null)
            rememberPlace()
            showUpdatingSplash(doc)
            apply()
          },
        })
        declined = true // asked once; not again until the next start
        return
      }
      rememberPlace()
      showUpdatingSplash(doc)
      apply()
    } finally {
      running = false
    }
  }
}

/** A calm "Updating…" cover for the second or so the restart takes. */
export function showUpdatingSplash(doc: Document): void {
  try {
    const el = doc.createElement('div')
    el.setAttribute('data-update-splash', '')
    el.setAttribute('role', 'status')
    el.textContent = t('update.splash')
    el.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:var(--color-bg,#fff);color:var(--color-fg,#222);font:500 16px system-ui,sans-serif;opacity:0.96'
    doc.body.appendChild(el)
  } catch {
    // The splash is only a courtesy.
  }
}
