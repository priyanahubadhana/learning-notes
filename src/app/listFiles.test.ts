import { afterEach, describe, expect, it, vi } from 'vitest'
import { listFiles } from './updateProgress'

afterEach(() => vi.unstubAllGlobals())

describe('T29 an unreadable file list is a failure, never "nothing to download"', () => {
  it('rejects when the network is down', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('offline')
    })
    await expect(listFiles()).rejects.toThrow()
  })
  it('rejects on a server error and on bad data', async () => {
    vi.stubGlobal('fetch', async () => new Response('x', { status: 503 }))
    await expect(listFiles()).rejects.toThrow()
    vi.stubGlobal('fetch', async () => Response.json({ nope: 1 }))
    await expect(listFiles()).rejects.toThrow()
  })
  it('an empty list that was read is fine', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ files: [] }))
    expect(await listFiles()).toEqual([])
  })
})
