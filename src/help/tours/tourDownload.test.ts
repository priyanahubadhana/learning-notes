import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  downloadTour,
  downloadedTour,
  removeTour,
  type TourDeps,
} from './tourDownload'
import { parseTour, TOUR_LIST } from './tourList'

const sha = async (t: string) => createHash('sha256').update(t).digest('hex')
const entry = TOUR_LIST[0]
const canon = (path: string) =>
  JSON.stringify(JSON.parse(readFileSync(path, 'utf8')))
const good = canon(`public${entry.url}`)

function deps(over: Partial<TourDeps> = {}) {
  let store: Record<string, string> = {}
  const d: TourDeps = {
    online: () => true,
    fetchText: async (_u, onBytes) => {
      onBytes(entry.bytes / 2)
      return good
    },
    sha256: sha,
    readAll: () => store,
    writeAll: (a) => (store = a),
    ...over,
  }
  return d
}

describe('tour download state machine', () => {
  it('the shipped tour files match their hash, size and format', async () => {
    for (const e of TOUR_LIST) {
      const text = canon(`public${e.url}`)
      expect(await sha(text)).toBe(e.sha256)
      expect(Buffer.byteLength(text)).toBe(e.bytes)
      expect(parseTour(text)?.id).toBe(e.id)
    }
  })

  it('downloads, reports progress, stores and reads back', async () => {
    const d = deps()
    const seen: number[] = []
    expect(await downloadTour(entry, d, (f) => seen.push(f))).toBe('ready')
    expect(seen[0]).toBe(0)
    expect(seen.at(-1)).toBe(1)
    expect(downloadedTour(entry.id, d)?.steps.length).toBeGreaterThan(0)
    removeTour(entry.id, d)
    expect(downloadedTour(entry.id, d)).toBeNull()
  })

  it('offline: nothing is fetched or kept', async () => {
    let fetched = false
    const d = deps({
      online: () => false,
      fetchText: async () => {
        fetched = true
        return good
      },
    })
    expect(await downloadTour(entry, d)).toBe('offline')
    expect(fetched).toBe(false)
    expect(d.readAll()).toEqual({})
  })

  it('a wrong hash, bad data or a failed request keeps nothing', async () => {
    for (const bad of [
      deps({ fetchText: async () => good.replace('review', 'reviewX') }),
      deps({ fetchText: async () => '{"id":"srs","steps":"x"}' }),
      deps({ fetchText: async () => 'not json at all' }),
      deps({
        fetchText: async () => {
          throw new Error('503')
        },
      }),
    ]) {
      expect(await downloadTour(entry, bad)).toBe('failed')
      expect(bad.readAll()).toEqual({})
    }
  })

  it('refuses tours that are not a short list of row ids', () => {
    expect(parseTour('{"id":"a","steps":[]}')).toBeNull()
    expect(parseTour('{"id":"a","steps":[{"setting":5}]}')).toBeNull()
    expect(
      parseTour('{"id":"a","steps":[{"setting":"x"}]}')?.steps,
    ).toHaveLength(1)
  })
})
