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
import { mandatoryUpdate } from './mandatoryState'
import type { UpdateRisk } from './autoUpdate'

export const COUNTDOWN_S = 5
/** If the restart has not come this long after Install, show Retry. */
export const INSTALL_MAX_MS = 30_000
/** The restart is forced if the service worker has not done it by now. */
export const FORCE_RESTART_MS = 6_000
const PARALLEL = 4

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
  const queue = [...todo]
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      const res = await get(f.u, { cache: 'reload', signal })
      if (!res.ok) throw new Error(`${f.u}: ${res.status}`)
      const reader = res.body?.getReader()
      if (!reader) {
        loaded += (await res.arrayBuffer()).byteLength
        onProgress(loaded, total)
        continue
      }
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        loaded += value.byteLength
        onProgress(loaded, total)
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker))
}

export interface Flow {
  cancel: () => void
  retry: () => void
}

let current: Flow | null = null

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
    try {
      await download((loaded, total) => {
        if (!controller.signal.aborted && !stopped)
          set({ phase: 'downloading', loaded, total })
      }, controller.signal)
    } catch {
      if (!controller.signal.aborted)
        set({ phase: 'failed', reason: 'download' })
      return
    }
    if (controller.signal.aborted) return
    await install()
  }

  const install = async () => {
    set({ phase: 'installing' })
    let risk: UpdateRisk | null
    try {
      risk = await deps.prepare()
    } catch {
      risk = { kind: 'unsaved' }
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
    after(() => deps.hardRestart?.(), FORCE_RESTART_MS)
    installTimer = after(() => {
      if (mandatoryUpdate.get()?.phase === 'installing')
        set({ phase: 'failed', reason: 'install' })
    }, INSTALL_MAX_MS)
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
  countdown(COUNTDOWN_S)
  return current
}

/** Tests only. */
export function resetMandatoryUpdate(): void {
  current = null
  mandatoryUpdate.set(null)
}
