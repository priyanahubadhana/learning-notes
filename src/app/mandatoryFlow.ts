/**
 * The mandatory update flow (BUG-004). Used ONLY when the new version is
 * marked `required` in /version.json (a storage change or a data fix). Other
 * updates keep the normal pill and the automatic rule.
 *
 *   countdown (5 s) -> download (progress) -> installing -> reload
 *
 * Cancel stops the countdown or the download, but the app stays blocked with
 * a Retry button. Any failure or interruption shows Retry too. Nothing here
 * writes or deletes notes: saves are flushed first and a save that cannot be
 * written holds the update back instead.
 */
import { downloadNewFiles } from './updateProgress'
import {
  mandatoryFailure,
  mandatoryMeta,
  mandatoryUpdate,
} from './mandatoryState'
import type { UpdateRisk } from './autoUpdate'
import { isOtherTabUpgrade } from './updates'
import { createSpeedMeter } from './updateSpeed'
import type { UpdateReason } from './updateLevel'

export const COUNTDOWN_S = 5
/** If the restart has not come this long after Install, show Retry. */
export const INSTALL_MAX_MS = 30_000
/** The restart is forced if the service worker has not done it by now. */
export const FORCE_RESTART_MS = 6_000
export { downloadNewFiles, STALL_MS } from './updateProgress'
/** update.v2: how long a change that is not saved yet may delay the install. */
export const SAVE_WAIT_MS = 5000
const SAVE_POLL_MS = 500

/** Whole seconds left at the measured speed; undefined while unknown. */
export function etaSeconds(
  loaded: number,
  total: number,
  elapsedMs: number,
): number | undefined {
  if (total <= 0 || loaded <= 0 || elapsedMs < 500 || loaded >= total)
    return undefined
  return Math.max(
    1,
    Math.ceil(((total - loaded) / loaded) * (elapsedMs / 1000)),
  )
}

export interface MandatoryDeps {
  /** Restarts into the new version. */
  apply: () => void
  /**
   * update.v2: how long the restart may take before Try again shows. A plain
   * reload (the About test button) can take longer than the 6 s default on a
   * real Safari, which revalidates every file on reload (L13).
   */
  restartMs?: number
  /** Flushes saves and takes the backup; a risk blocks the update. */
  prepare: () => Promise<UpdateRisk | null>
  /** Last resort restart (drops old files, reloads). */
  hardRestart?: () => void
  /** Downloads the new files, reporting bytes; rejects on failure. */
  download?: (
    onProgress: (loaded: number, total: number) => void,
    signal: AbortSignal,
  ) => Promise<void>
  after?: (run: () => void, ms: number) => unknown
  clear?: (handle: unknown) => void
  /** update.v2: the new rules (reason, offline wait, save wait, 6 s limit). */
  v2?: boolean
  reason?: UpdateReason
  /** update.v2: is there a network now? */
  online?: () => boolean
  /** update.v2: calls `fn` when the network goes or comes back; returns a stop. */
  watchOnline?: (fn: (online: boolean) => void) => () => void
  now?: () => number
  /**
   * P1.8: may "Not now" leave a failed update? Not when another tab already
   * upgraded the notes (U11): this tab has closed its database then.
   */
  mayLeave?: () => boolean
}

export interface Flow {
  cancel: () => void
  retry: () => void
  /**
   * P1.8 "Not now" on the failed screen: back to the app. The next look for
   * updates that still finds the must-have version shows the notice again.
   * Paused keeps the app blocked (docs/features/update-v2.md UV-5, line 132).
   */
  dismiss: () => void
  /** "Update now" in the countdown: download at once. */
  startNow: () => void
  /** False when the app must stay blocked (U11: another tab upgraded the notes). */
  canDismiss: () => boolean
}

let current: Flow | null = null
let stopWatching: (() => void) | undefined

/** The running flow's actions (the screen's buttons). */
export const flow = (): Flow | null => current

/** Starts the flow once; a second call while it runs does nothing. */
export function startMandatoryUpdate(deps: MandatoryDeps): Flow {
  if (
    current &&
    mandatoryUpdate.get() !== null &&
    mandatoryUpdate.get()?.phase !== 'waiting'
  )
    return current
  // Closed with "Not now" after a failure: start over with the new look.
  stopWatching?.()
  stopWatching = undefined
  const after = deps.after ?? ((run, ms) => setTimeout(run, ms))
  const clear =
    deps.clear ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>))
  const download = deps.download ?? ((p, s) => downloadNewFiles(p, s))
  const set = mandatoryUpdate.set
  const v2 = deps.v2 === true
  mandatoryMeta.set({ v2, reason: deps.reason ?? 'storage' })
  const now = deps.now ?? Date.now
  const isOnline =
    deps.online ?? (() => typeof navigator === 'undefined' || navigator.onLine)
  const mayLeave = deps.mayLeave ?? (() => !isOtherTabUpgrade())
  let startedAt = 0
  let abort: AbortController | null = null
  let timer: unknown
  let installTimer: unknown
  let tickTimer: unknown
  let stopped = false

  const countdown = (left: number) => {
    clear(timer)
    set({ phase: 'countdown', left })
    if (left <= 0) {
      void run()
      return
    }
    timer = after(() => countdown(left - 1), 1000)
  }

  const run = async () => {
    stopped = false
    const controller = (abort = new AbortController())
    set({ phase: 'downloading', loaded: 0, total: 0 })
    mandatoryFailure.set(null)
    startedAt = now()
    // P1.8: the speed clock starts with the first progress call (the files
    // start coming), not while the list and the offline copy are read.
    let started = false
    const meter = createSpeedMeter()
    let last = { loaded: 0, total: 0 }
    const show = () => {
      if (controller.signal.aborted || stopped) return
      const r = v2 ? meter.add(now(), last.loaded, last.total) : undefined
      set({
        phase: 'downloading',
        loaded: last.loaded,
        total: last.total,
        etaS: r?.etaS,
        slow: r?.slow,
        bps: r?.bps,
      })
    }
    // The clock also ticks when nothing arrives: a stalled line is slow too.
    const tick = () => {
      if (controller.signal.aborted || stopped) return
      if (started) show()
      tickTimer = after(tick, 1000)
    }
    if (v2) tickTimer = after(tick, 1000)
    try {
      await download((loaded, total) => {
        if (controller.signal.aborted || stopped) return
        started = true
        last = { loaded, total }
        show()
      }, controller.signal)
      clear(tickTimer)
    } catch {
      clear(tickTimer)
      if (controller.signal.aborted) return
      // T29: a download that cannot go on is over. A late progress report from
      // a parallel file must never replace the "did not finish" note.
      stopped = true
      controller.abort()
      // Offline is not a failure: wait for the network (update.v2).
      if (v2 && !isOnline()) set({ phase: 'offline' })
      else {
        mandatoryFailure.set({ what: 'download', waitedMs: now() - startedAt })
        set({ phase: 'failed', reason: 'download' })
      }
      return
    }
    if (controller.signal.aborted) return
    await install()
  }

  const install = async () => {
    set({ phase: 'installing' })
    let risk: UpdateRisk | null
    const prep = async (): Promise<UpdateRisk | null> => {
      try {
        return await deps.prepare()
      } catch {
        return { kind: 'unsaved' }
      }
    }
    risk = await prep()
    // update.v2: a save that is still running gets up to 5 s to finish.
    for (
      let waited = 0;
      v2 && risk?.kind === 'unsaved' && waited < SAVE_WAIT_MS;
      waited += SAVE_POLL_MS
    ) {
      await new Promise<void>((r) => after(r, SAVE_POLL_MS))
      risk = await prep()
    }
    // Unwritten changes hold the update back; a low-space backup does not
    // (the notes stay in the browser database across the restart).
    if (risk?.kind === 'unsaved') {
      set({ phase: 'failed', reason: 'unsaved' })
      return
    }
    try {
      deps.apply()
    } catch {
      set({ phase: 'failed', reason: 'install' })
      return
    }
    const installAt = now()
    const failIfStuck = () => {
      if (mandatoryUpdate.get()?.phase === 'installing') {
        mandatoryFailure.set({ what: 'restart', waitedMs: now() - installAt })
        set({ phase: 'failed', reason: 'install' })
      }
    }
    if (v2) {
      // No restart within 6 s: say so, with Try again (nothing is lost).
      installTimer = after(failIfStuck, deps.restartMs ?? FORCE_RESTART_MS)
      return
    }
    after(() => deps.hardRestart?.(), FORCE_RESTART_MS)
    installTimer = after(failIfStuck, INSTALL_MAX_MS)
  }

  current = {
    cancel() {
      const phase = mandatoryUpdate.get()?.phase
      if (phase !== 'countdown' && phase !== 'downloading') return
      stopped = true
      clear(timer)
      clear(tickTimer)
      abort?.abort()
      set({ phase: 'paused' })
    },
    retry() {
      const phase = mandatoryUpdate.get()?.phase
      if (phase !== 'paused' && phase !== 'failed' && phase !== 'waiting')
        return
      clear(installTimer)
      void run()
    },
    startNow() {
      if (mandatoryUpdate.get()?.phase !== 'countdown') return
      clear(timer)
      void run()
    },
    dismiss() {
      if (mandatoryUpdate.get()?.phase !== 'failed' || !mayLeave()) return
      clear(installTimer)
      mandatoryFailure.set(null)
      set({ phase: 'waiting' })
    },
    canDismiss: () => mayLeave(),
  }
  if (v2) {
    const watch =
      deps.watchOnline ??
      ((fn) => {
        if (typeof window === 'undefined') return () => {}
        const up = () => fn(true)
        const down = () => fn(false)
        window.addEventListener('online', up)
        window.addEventListener('offline', down)
        return () => {
          window.removeEventListener('online', up)
          window.removeEventListener('offline', down)
        }
      })
    stopWatching = watch((online) => {
      const phase = mandatoryUpdate.get()?.phase
      if (!online && (phase === 'countdown' || phase === 'downloading')) {
        stopped = true
        clear(timer)
        clear(tickTimer)
        abort?.abort()
        set({ phase: 'offline' })
      } else if (online && phase === 'offline') {
        countdown(COUNTDOWN_S)
      }
    })
  }
  if (v2 && !isOnline()) set({ phase: 'offline' })
  else countdown(COUNTDOWN_S)
  return current
}

/** Tests only. */
export function resetMandatoryUpdate(): void {
  stopWatching?.()
  stopWatching = undefined
  current = null
  mandatoryMeta.set({ v2: false, reason: 'storage' })
  mandatoryUpdate.set(null)
  mandatoryFailure.set(null)
}
