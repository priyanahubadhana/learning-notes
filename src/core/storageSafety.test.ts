import { describe, expect, it, vi } from 'vitest'
import {
  storageNearlyFull,
  isConnectionLost,
  isSafariTab,
  makeBackupDownload,
  storageProblem,
} from './storageSafety'

const IPAD_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

describe('isSafariTab', () => {
  it('is true on an iPad Safari tab (desktop-style UA with touch)', () => {
    expect(
      isSafariTab({ userAgent: IPAD_UA, maxTouchPoints: 5, standalone: false }),
    ).toBe(true)
  })
  it('is true on an iPhone Safari tab', () => {
    expect(isSafariTab({ userAgent: IPHONE_UA, maxTouchPoints: 5 })).toBe(true)
  })
  it('is false once added to the Home Screen', () => {
    expect(
      isSafariTab({ userAgent: IPAD_UA, maxTouchPoints: 5, standalone: true }),
    ).toBe(false)
    expect(
      isSafariTab({
        userAgent: IPHONE_UA,
        maxTouchPoints: 5,
        displayStandalone: true,
      }),
    ).toBe(false)
  })
  it('is false on a Mac (no touch) and on other browsers', () => {
    expect(isSafariTab({ userAgent: IPAD_UA, maxTouchPoints: 0 })).toBe(false)
    expect(isSafariTab({ userAgent: CHROME_UA, maxTouchPoints: 10 })).toBe(
      false,
    )
  })
})

describe('isConnectionLost', () => {
  it('spots the Safari "connection lost" failure, also when wrapped', () => {
    const raw = {
      name: 'UnknownError',
      message: 'Connection to Indexed Database server lost. Refresh the page',
    }
    expect(isConnectionLost(raw)).toBe(true)
    expect(isConnectionLost({ name: 'OpenFailedError', inner: raw })).toBe(true)
    expect(isConnectionLost({ name: 'DatabaseClosedError' })).toBe(true)
  })
  it('ignores ordinary errors and junk', () => {
    expect(isConnectionLost(new Error('x'))).toBe(false)
    expect(isConnectionLost(null)).toBe(false)
    const loop: { name: string; inner?: unknown } = { name: 'A' }
    loop.inner = loop
    expect(isConnectionLost(loop)).toBe(false)
  })
})

describe('storageProblem', () => {
  it('names full, lost or nothing', () => {
    expect(storageProblem({ name: 'QuotaExceededError' })).toBe('full')
    expect(storageProblem({ name: 'DatabaseClosedError' })).toBe('lost')
    expect(storageProblem(new Error('x'))).toBeUndefined()
  })
})

describe('makeBackupDownload', () => {
  it('reads only (never deletes) and returns a named JSON file', async () => {
    const read = vi.fn(async () => ({
      app: 'learning-notes' as const,
      dbName: 'learning-notes',
      version: 24,
      createdAt: Date.UTC(2026, 10, 13),
      tables: { notes: [{ id: 'n1' }] },
    }))
    const file = await makeBackupDownload('learning-notes', read)
    expect(read).toHaveBeenCalledWith('learning-notes')
    expect(file.name).toBe('learning-notes-backup-v24-2026-11-13.json')
    expect(JSON.parse(await file.blob.text()).tables.notes[0].id).toBe('n1')
  })
})

describe('storageNearlyFull', () => {
  const sm = (usage: number, quota: number) =>
    ({ estimate: async () => ({ usage, quota }) }) as unknown as StorageManager
  it('is true at 90% or more of the quota', async () => {
    expect(await storageNearlyFull(sm(90, 100))).toBe(true)
  })
  it('is false below 90%', async () => {
    expect(await storageNearlyFull(sm(50, 100))).toBe(false)
  })
  it('is false when the estimate is missing or throws', async () => {
    expect(await storageNearlyFull(undefined)).toBe(false)
    const bad = {
      estimate: async () => {
        throw new Error('x')
      },
    } as unknown as StorageManager
    expect(await storageNearlyFull(bad)).toBe(false)
  })
})
