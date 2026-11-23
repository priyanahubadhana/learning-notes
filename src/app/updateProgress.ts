/**
 * Counts the download of a new version (item 24). /precache.json lists the
 * new build's files with sizes. The offline copy (Workbox) fetches new files
 * ONE AT A TIME while it installs (P1.8: hundreds of round trips on an iPad),
 * so the page fetches the same files in parallel first: the browser keeps
 * them (the names carry a hash and never change), the offline copy then
 * takes them from there, and the bytes give an honest progress and speed.
 * Loaded on demand (not in the first download).
 */
import { updateStatus } from './updateStatus'
import { isOn } from './flags'

export interface Listed {
  u: string
  s: number
}

/** Files fetched at the same time. */
const PARALLEL = 6
/** No byte from any file for this long: the download is stopped (Try again). */
export const STALL_MS = 20_000

/** Bytes and files fetched so far, and the totals, for files not cached before. */
export function progressOf(
  listed: readonly Listed[],
  before: ReadonlySet<string>,
  now: ReadonlySet<string>,
): { loaded: number; total: number; files: number; filesTotal: number } {
  let loaded = 0
  let total = 0
  let files = 0
  let filesTotal = 0
  for (const f of listed) {
    if (before.has(f.u)) continue
    total += f.s
    filesTotal++
    if (now.has(f.u)) {
      loaded += f.s
      files++
    }
  }
  return { loaded, total, files, filesTotal }
}

/** Seconds left at the speed so far, or undefined when unknown. */
export function etaSeconds(
  loaded: number,
  total: number,
  elapsedMs: number,
): number | undefined {
  if (loaded <= 0 || elapsedMs <= 0) return undefined
  return Math.max(
    1,
    Math.round(((total - loaded) / loaded) * (elapsedMs / 1000)),
  )
}

/** A download with this many seconds left or more may be called slow. */
export const SLOW_ETA_S = 8
/** Below this speed (bytes per second, about 1.2 Mbit/s) the connection is slow. */
export const SLOW_BYTES_PER_S = 150_000
/** The speed is not judged before this much time has passed. */
const SLOW_JUDGE_MS = 1500

/**
 * The seconds left, only when the CONNECTION is slow (P1.8: it used to be
 * "a long time left", so a big update on a fast home network said "slow").
 */
export function slowEtaS(
  loaded: number,
  total: number,
  elapsedMs: number,
): number | undefined {
  if (loaded <= 0 || elapsedMs < SLOW_JUDGE_MS) return undefined
  if (loaded / (elapsedMs / 1000) >= SLOW_BYTES_PER_S) return undefined
  const eta = etaSeconds(loaded, total, elapsedMs)
  return eta !== undefined && eta >= SLOW_ETA_S ? eta : undefined
}

export async function cachedPaths(): Promise<Set<string>> {
  const out = new Set<string>()
  try {
    for (const name of await caches.keys()) {
      if (!name.includes('precache')) continue
      for (const req of await (await caches.open(name)).keys())
        out.add(new URL(req.url).pathname)
    }
  } catch {
    // No cache access: no count.
  }
  return out
}

/**
 * The list of files of the newest build. T29: a list that cannot be read
 * (offline, a server error, bad data) is a failure, never "nothing to
 * download": that would install and restart with nothing fetched.
 */
export async function listFiles(): Promise<Listed[]> {
  const res = await fetch(`/precache.json?t=${Date.now()}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`precache.json: ${res.status}`)
  const { files } = (await res.json()) as { files?: Listed[] }
  if (!Array.isArray(files)) throw new Error('precache.json: no list')
  return files
}

/**
 * Fetches every new file of the build (not yet cached) in parallel, counting
 * bytes; rejects on failure. The first progress call (0, total) comes when
 * the files start coming, so the time before it is not download time.
 */
export async function downloadNewFiles(
  onProgress: (loaded: number, total: number) => void,
  signal: AbortSignal,
  files: () => Promise<Listed[]> = listFiles,
  have: () => Promise<Set<string>> = cachedPaths,
  get: typeof fetch = (input, init) => fetch(input, init),
): Promise<void> {
  const [listed, before] = await Promise.all([files(), have()])
  // An empty file is never served (P1.8); an old list may still name one.
  const todo = listed.filter((f) => f.s > 0 && !before.has(f.u))
  let total = todo.reduce((sum, f) => sum + f.s, 0)
  let loaded = 0
  onProgress(0, total)
  if (todo.length === 0) return
  const queue = [...todo]
  // A newer version published during the download removes old names: a 404
  // for a file the newest list no longer names is skipped (read once). A list
  // that cannot be read (or is empty) proves nothing: the 404 is a failure.
  let newest: Promise<Set<string> | null> | undefined
  const stillListed = async (u: string) => {
    newest ??= files().then(
      (l) => (l.length > 0 ? new Set(l.map((f) => f.u)) : null),
      () => null,
    )
    const names = await newest
    return names === null || names.has(u)
  }
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
      if (res.status === 404 && !(await stillListed(f.u))) {
        total -= f.s
        onProgress(loaded, total)
        continue
      }
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

/** Watches a registration: each new worker's download shows in the pill. */
export function trackInstalls(reg: ServiceWorkerRegistration): void {
  reg.addEventListener('updatefound', () => {
    const worker = reg.installing
    if (worker) void follow(worker)
  })
}

/** The pill while a new worker installs (exported for tests). */
export async function follow(
  worker: ServiceWorker,
  download: typeof downloadNewFiles = downloadNewFiles,
): Promise<void> {
  updateStatus.set({ phase: 'downloading', loaded: 0, total: 0 })
  const listedP = listFiles()
  const beforeP = cachedPaths()
  let firstList = true
  const files = () => {
    if (!firstList) return listFiles()
    firstList = false
    return listedP
  }
  let live = worker.state === 'installing'
  const stop = new AbortController()
  // Bytes from the parallel fetch; null when it failed (then: count the cache).
  // update.v2: one download only. The worker's own install fetches every file;
  // a second fetch of the same files doubled the download (WebKit does not
  // share them), so the bar counts what the worker has saved instead.
  const countOnly = isOn('update.v2')
  let warm: { loaded: number; total: number; started: number } | null =
    countOnly ? null : { loaded: 0, total: 0, started: 0 }
  if (!countOnly)
    void download(
      (loaded, total) => {
        if (!warm) return
        if (!warm.started) warm.started = Date.now()
        warm.loaded = loaded
        warm.total = total
      },
      stop.signal,
      files,
      () => beforeP,
    ).catch(() => {
      warm = null
    })
  const started = Date.now()
  const listed = await listedP
  const before = await beforeP
  const poll = async () => {
    if (!live) return
    // A restart already asked for (the prompt, the wait, "did not finish")
    // is not overwritten by the numbers of a download still running.
    if (countOnly && updateStatus.get().phase === 'updating')
      return void setTimeout(() => void poll(), 500)
    if (!navigator.onLine) {
      updateStatus.set({ phase: 'offline' })
    } else if (warm) {
      if (warm.total > 0)
        updateStatus.set({
          phase: 'downloading',
          loaded: warm.loaded,
          total: warm.total,
          etaS: slowEtaS(warm.loaded, warm.total, Date.now() - warm.started),
        })
    } else {
      const p = progressOf(listed, before, await cachedPaths())
      if (live && p.total > 0)
        updateStatus.set({
          phase: 'downloading',
          loaded: p.loaded,
          total: p.total,
          etaS: slowEtaS(p.loaded, p.total, Date.now() - started),
        })
    }
    setTimeout(() => void poll(), 500)
  }
  void poll()
  const done = () => {
    if (worker.state === 'installing') return
    live = false
    stop.abort()
    if (worker.state === 'redundant') updateStatus.set({ phase: 'failed' })
    else {
      const installing = () => {
        updateStatus.set({ phase: 'installing' })
        // The auto-update rule takes over from here (it sets "updating").
        setTimeout(() => {
          if (updateStatus.get().phase === 'installing')
            updateStatus.set({ phase: 'ready' })
        }, 800)
      }
      const cur = updateStatus.get()
      const total = cur.total || warm?.total || 0
      if (
        countOnly &&
        cur.phase === 'downloading' &&
        total > 0 &&
        (cur.total !== total || (cur.loaded ?? 0) < total)
      ) {
        // The last poll can stop short (99 percent) or not run at all on a
        // fast line: the bar ends at 100 first.
        updateStatus.set({ phase: 'downloading', loaded: total, total })
        setTimeout(() => {
          if (updateStatus.get().phase === 'downloading') installing()
        }, 400)
      } else installing()
    }
  }
  worker.addEventListener('statechange', done)
  done()
}
