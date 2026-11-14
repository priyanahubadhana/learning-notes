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
import { cachedPaths, listFiles, type Listed } from './updateProgress'
import { mandatoryMeta, mandatoryUpdate } from './mandatoryState'
import type { UpdateRisk } from './autoUpdate'
import type { UpdateReason } from './updateLevel'

export const COUNTDOWN_S = 5
/** If the restart has not come this long after Install, show Retry. */
export const INSTALL_MAX_MS = 30_000
/** The restart is forced if the service worker has not done it by now. */
export const FORCE_RESTART_MS = 6_000
const PARALLEL = 4
/** No byte from any file for this long: the download is stopped (Try again). */
export const STALL_MS = 20_000
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
}

/** Fetches every new file of the build (not yet cached), counting bytes. */
export async function downloadNewFiles(
  onProgress: (loaded: number, total: number) => void,
  signal: AbortSignal,
  files: () => Promise<Listed[]> = listFiles,
  have: () => Promise<Set<string>> = cachedPaths,
  get: typeof fetch = (input, init) => fetch(input, init),
): Promise<void> {
  const [listed, before] = await Promise.all([files(), have()])
  const todo = listed.filter((f) => !before.has(f.u))
  const total = todo.reduce((sum, f) => sum + f.s, 0)
  let loaded = 0
  onProgress(0, total)
  if (todo.length === 0) return
  const queue = [...todo]
  // Watchdog: any byte resets it; silence for STALL_MS stops the whole download.
  const stop = new AbortController()
  const link = () => stop.abort()
  signal.onabort = link
  let dead: (e: Error) => void = () => {}
  const dying = new Promise<never>((_, rej) => (dead = rej))
  dying.catch(() => {})
  const fail = (why: string) => {
    stop.abort()
    dead(new Error(why))
  }
  let watchdog = setTimeout(() => fail('stalled'), STALL_MS)
  const alive = () => {
    clearTimeout(watchdog)
    watchdog = setTimeout(() => fail('stalled'), STALL_MS)
  }
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      const res = await get(f.u, { cache: 'reload', signal: stop.signal })
      alive()
      if (!res.ok) throw new Error(`${f.u}: ${res.status}`)
      const reader = res.body?.getReader()
      if (!reader) {
        loaded += (await res.arrayBuffer()).byteLength
        alive()
        onProgress(loaded, total)
        continue
      }
      for (;;) {
        const { done, value } = await reader.read()
        alive()
        if (done) break
        loaded += value.byteLength
        onProgress(loaded, total)
      }
    }
  }
  try {
    await Promise.race([
      Promise.all(Array.from({ length: PARALLEL }, worker)),
      dying,
    ])
  } finally {
    clearTimeout(watchdog)
    signal.onabort = null
    stop.abort()
  }
}

export interface Flow {
  cancel: () => void
  retry: () => void
}

let current: Flow | null = null
let stopWatching: (() => void) | undefined

/** The running flow's actions (the screen's buttons). */
export const flow = (): Flow | null => current

/** Starts the flow once; a second call while it runs does nothing. */
export function startMandatoryUpdate(deps: MandatoryDeps): Flow {
  if (current) return current
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
  let startedAt = 0
  let abort: AbortController | null = null
  let timer: unknown
  let installTimer: unknown
  let stopped = false

  const countdown = (left: number) => {
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
    startedAt = now()
    try {
      await download((loaded, total) => {
        if (controller.signal.aborted || stopped) return
        const etaS = v2
          ? etaSeconds(loaded, total, now() - startedAt)
          : undefined
        set({ phase: 'downloading', loaded, total, etaS })
      }, controller.signal)
    } catch {
      if (controller.signal.aborted) return
      // Offline is not a failure: wait for the network (update.v2).
      if (v2 && !isOnline()) set({ phase: 'offline' })
      else set({ phase: 'failed', reason: 'download' })
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
    const failIfStuck = () => {
      if (mandatoryUpdate.get()?.phase === 'installing')
        set({ phase: 'failed', reason: 'install' })
    }
    if (v2) {
      // No restart within 6 s: say so, with Try again (nothing is lost).
      installTimer = after(failIfStuck, FORCE_RESTART_MS)
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
      abort?.abort()
      set({ phase: 'paused' })
    },
    retry() {
      const phase = mandatoryUpdate.get()?.phase
      if (phase !== 'paused' && phase !== 'failed') return
      clear(installTimer)
      void run()
    },
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
}
