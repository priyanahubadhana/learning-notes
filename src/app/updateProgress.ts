/**
 * Counts the download of a new version (item 24). The service worker fills
 * the precache while it installs; /precache.json lists the new build's files
 * with sizes, so progress = new files now in the cache / new files to fetch.
 * Loaded on demand (not in the first download).
 */
import { updateStatus } from './updateStatus'

export interface Listed {
  u: string
  s: number
}

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

/** A download with this many seconds left or more is called slow. */
export const SLOW_ETA_S = 8

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

export async function listFiles(): Promise<Listed[]> {
  try {
    const res = await fetch(`/precache.json?t=${Date.now()}`, {
      cache: 'no-store',
    })
    const { files } = (await res.json()) as { files?: Listed[] }
    return Array.isArray(files) ? files : []
  } catch {
    return []
  }
}

/** Watches a registration: each new worker's download shows in the pill. */
export function trackInstalls(reg: ServiceWorkerRegistration): void {
  reg.addEventListener('updatefound', () => {
    const worker = reg.installing
    if (worker) void follow(worker)
  })
}

async function follow(worker: ServiceWorker): Promise<void> {
  const started = Date.now()
  const before = await cachedPaths()
  const listed = await listFiles()
  updateStatus.set({ phase: 'downloading', loaded: 0, total: 0 })
  let live = worker.state === 'installing'
  const poll = async () => {
    if (!live) return
    if (!navigator.onLine) {
      updateStatus.set({ phase: 'offline' })
    } else {
      const p = progressOf(listed, before, await cachedPaths())
      if (live && p.total > 0) {
        const eta = etaSeconds(p.loaded, p.total, Date.now() - started)
        updateStatus.set({
          phase: 'downloading',
          loaded: p.loaded,
          total: p.total,
          etaS: eta !== undefined && eta >= SLOW_ETA_S ? eta : undefined,
        })
      }
    }
    setTimeout(() => void poll(), 500)
  }
  void poll()
  const done = () => {
    if (worker.state === 'installing') return
    live = false
    if (worker.state === 'redundant') updateStatus.set({ phase: 'failed' })
    else {
      updateStatus.set({ phase: 'installing' })
      // The auto-update rule takes over from here (it sets "updating").
      setTimeout(() => {
        if (updateStatus.get().phase === 'installing')
          updateStatus.set({ phase: 'ready' })
      }, 800)
    }
  }
  worker.addEventListener('statechange', done)
  done()
}
