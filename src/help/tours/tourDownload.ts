import { parseTour, type Tour, type TourEntry } from './tourList'

export type TourStatus = 'idle' | 'downloading' | 'ready' | 'offline' | 'failed'

export const TOURS_KEY = 'learning-notes:tours'

/** What the download needs from the outside (so tests need no network). */
export interface TourDeps {
  online(): boolean
  /** Fetches the file; reports bytes read so far. */
  fetchText(url: string, onBytes: (n: number) => void): Promise<string>
  sha256(text: string): Promise<string>
  readAll(): Record<string, string>
  writeAll(all: Record<string, string>): void
}

/** The hash is taken over the canonical JSON, so line endings do not matter. */
const canonical = (text: string) => JSON.stringify(JSON.parse(text))

/**
 * SET-B23: download one tour. Offline: stop at once, keep nothing. A wrong
 * hash, bad data or a failed request keeps nothing either (no partial tour).
 * Progress is reported as 0 to 1.
 */
export async function downloadTour(
  entry: TourEntry,
  deps: TourDeps,
  onProgress: (fraction: number) => void = () => {},
): Promise<TourStatus> {
  if (!deps.online()) return 'offline'
  try {
    onProgress(0)
    const text = await deps.fetchText(entry.url, (n) =>
      onProgress(Math.min(1, n / Math.max(1, entry.bytes))),
    )
    const tour = parseTour(text)
    if (!tour || tour.id !== entry.id) return 'failed'
    if ((await deps.sha256(canonical(text))) !== entry.sha256) return 'failed'
    deps.writeAll({ ...deps.readAll(), [entry.id]: canonical(text) })
    onProgress(1)
    return 'ready'
  } catch {
    return 'failed'
  }
}

export function removeTour(id: string, deps: TourDeps): void {
  const rest = { ...deps.readAll() }
  delete rest[id]
  deps.writeAll(rest)
}

export function downloadedTour(id: string, deps: TourDeps): Tour | null {
  const text = deps.readAll()[id]
  return text ? parseTour(text) : null
}

export const browserDeps: TourDeps = {
  online: () => navigator.onLine !== false,
  async fetchText(url, onBytes) {
    const res = await fetch(url, { credentials: 'omit' })
    if (!res.ok) throw new Error(String(res.status))
    const reader = res.body?.getReader()
    if (!reader) return res.text()
    const chunks: Uint8Array[] = []
    let n = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      n += value.length
      onBytes(n)
    }
    const all = new Uint8Array(n)
    let at = 0
    for (const c of chunks) {
      all.set(c, at)
      at += c.length
    }
    return new TextDecoder().decode(all)
  },
  async sha256(text) {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(text),
    )
    return [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  },
  readAll() {
    try {
      const v: unknown = JSON.parse(
        globalThis.localStorage?.getItem(TOURS_KEY) ?? '{}',
      )
      if (typeof v !== 'object' || v === null) return {}
      return Object.fromEntries(
        Object.entries(v).filter(
          (e): e is [string, string] => typeof e[1] === 'string',
        ),
      )
    } catch {
      return {}
    }
  },
  writeAll(all) {
    try {
      globalThis.localStorage?.setItem(TOURS_KEY, JSON.stringify(all))
    } catch {
      // Storage full or blocked: the tour stays until the app closes.
    }
  },
}
