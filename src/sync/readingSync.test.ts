// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  bindFavouriteWriter,
  favourites,
  reconcileFavourites,
  toggleFavourite,
} from '../app/favourites'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { saveProgress } from '../library/libraryService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { memoryConnectors as mem } from './connectors'
import { createMasterKey, type MasterKey } from './crypto'
import { setDeviceIdForTests, setTracking } from './device'
import { enqueueChanged, syncOnce } from './engine'
import { mergePageReading, mergeRecord } from './merge'

/** Reading progress and favourite stars follow the account (sync rules). */

let master: MasterKey
let a: LearningNotesDB
let b: LearningNotesDB

beforeEach(async () => {
  setTracking(true)
  master = await createMasterKey()
  a = createTestDb()
  b = createTestDb()
  localStorage.clear()
  favourites.clearCache()
})
afterEach(() => {
  setTracking(false)
  bindFavouriteWriter(null)
})

const pause = () => new Promise((r) => setTimeout(r, 5))

/** A book page on device A, synced to B. */
async function sharedBook(conn: ReturnType<typeof mem>) {
  setDeviceIdForTests('A')
  const ws = await getOrCreateDefaultWorkspace(a)
  const nb = await createNotebook(a, ws.id, 'Books')
  const page = await createPage(a, nb.id, null, 'Anatomy')
  await a.pages.update(page.id, {
    source: { kind: 'book', format: 'pdf', pageCount: 100, progress: 0.1 },
  })
  await syncOnce(a, conn, master)
  await syncOnce(b, conn, master)
  return page
}

describe('reading progress follows the account', () => {
  it('moves the place read, the furthest place and the page count to the other device', async () => {
    const conn = mem()
    const page = await sharedBook(conn)
    setDeviceIdForTests('A')
    await saveProgress(a, page.id, {
      progress: 0.42,
      at: 'pdf:42:0.1000',
      openedAt: 1000,
    })
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    const got = (await b.pages.get(page.id))?.source
    expect(got?.progress).toBe(0.42)
    expect(got?.at).toBe('pdf:42:0.1000')
    expect(got?.furthest).toBe(0.42)
    expect(got?.pageCount).toBe(100)
    // What came from the other device is not sent back as a new change.
    expect(await b.syncState.where('dirty').equals(1).count()).toBe(0)
  })

  it('two devices reading the same book offline: the later read place wins, the furthest is kept', async () => {
    const conn = mem()
    const page = await sharedBook(conn)
    // A reads far (earlier), B reads a little (later), both offline.
    setDeviceIdForTests('A')
    await saveProgress(a, page.id, {
      progress: 0.8,
      at: 'pdf:80:0.0000',
      openedAt: 1000,
    })
    await pause()
    setDeviceIdForTests('B')
    await saveProgress(b, page.id, {
      progress: 0.3,
      at: 'pdf:30:0.5000',
      openedAt: 2000,
    })
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    await syncOnce(a, conn, master)
    for (const db of [a, b]) {
      const s = (await db.pages.get(page.id))?.source
      expect(s?.progress).toBe(0.3)
      expect(s?.at).toBe('pdf:30:0.5000')
      // The furthest place ever read is not lost.
      expect(s?.furthest).toBe(0.8)
      expect(s?.furthestAt).toBe('pdf:80:0.0000')
    }
  })

  it('the older read place never wins just because its change has the newer clock', async () => {
    const conn = mem()
    const page = await sharedBook(conn)
    setDeviceIdForTests('B')
    await saveProgress(b, page.id, {
      progress: 0.6,
      at: 'pdf:60:0.0000',
      openedAt: 5000,
    })
    await pause()
    setDeviceIdForTests('A')
    await saveProgress(a, page.id, {
      progress: 0.2,
      at: 'pdf:20:0.0000',
      openedAt: 3000,
    })
    // A's change has the newer clock, B's the newer read.
    await syncOnce(b, conn, master)
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    for (const db of [a, b]) {
      expect((await db.pages.get(page.id))?.source?.progress).toBe(0.6)
    }
  })

  it('reading on one device does not undo a title change on the other', async () => {
    const conn = mem()
    const page = await sharedBook(conn)
    setDeviceIdForTests('A')
    await saveProgress(a, page.id, {
      progress: 0.5,
      at: 'pdf:50:0.0000',
      openedAt: 9000,
    })
    await pause()
    setDeviceIdForTests('B')
    await b.pages.update(page.id, { title: 'Anatomy 2nd edition' })
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    await syncOnce(a, conn, master)
    for (const db of [a, b]) {
      const p = await db.pages.get(page.id)
      expect(p?.title).toBe('Anatomy 2nd edition') // B's later edit wins the page
      expect(p?.source?.progress).toBe(0.5) // and A's place is kept
    }
  })

  it('a book read while sync was off is found and sent when sync starts', async () => {
    setTracking(false)
    const ws = await getOrCreateDefaultWorkspace(a)
    const nb = await createNotebook(a, ws.id, 'Books')
    const page = await createPage(a, nb.id, null, 'Offline book')
    await a.pages.update(page.id, {
      source: { kind: 'book', format: 'pdf', progress: 0 },
    })
    setTracking(true)
    const conn = mem()
    await enqueueChanged(a)
    await syncOnce(a, conn, master)
    // Later: more reading with sync tracking off, then on.
    setTracking(false)
    await saveProgress(a, page.id, {
      progress: 0.7,
      at: 'pdf:7:0.0000',
      openedAt: Date.now() + 10_000,
    })
    setTracking(true)
    expect(await enqueueChanged(a)).toBeGreaterThan(0)
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    expect((await b.pages.get(page.id))?.source?.progress).toBe(0.7)
  })
})

describe('the merge rule for a page', () => {
  const base = { id: 'p', title: 't', deletedAt: null }
  it('keeps the winner as it is when neither side has reading or a star', () => {
    expect(mergePageReading(base, { ...base, title: 'x' })).toBeNull()
  })
  it('takes the star set most recently, whoever won the page', () => {
    const winner = { ...base, favourite: { on: false, at: 10 } }
    const loser = { ...base, favourite: { on: true, at: 20 } }
    expect(mergePageReading(winner, loser)?.favourite).toEqual({
      on: true,
      at: 20,
    })
    // The older star never overrides.
    expect(mergePageReading(loser, winner)).toBeNull()
  })
  it('is not applied when the person chose a side', () => {
    const local = {
      value: { ...base, favourite: { on: true, at: 1 } },
      hlc: '0000000000001-0000-A',
      dirty: true,
    }
    const remote = {
      value: { ...base, favourite: { on: false, at: 2 } },
      hlc: '0000000000002-0000-B',
    }
    expect(mergeRecord('record', local, remote, 'here', 'pages')).toEqual({
      action: 'keep',
    })
  })
  it('only pages get the rule', () => {
    const local = {
      value: { ...base, favourite: { on: true, at: 1 } },
      hlc: '0000000000002-0000-A',
      dirty: true,
    }
    const remote = {
      value: { ...base, favourite: { on: false, at: 2 } },
      hlc: '0000000000001-0000-B',
    }
    expect(mergeRecord('record', local, remote, undefined, 'cards')).toEqual({
      action: 'keep',
    })
  })
})

describe('favourite stars follow the account', () => {
  it('a star set on one device reaches the other, and removing it follows', async () => {
    const conn = mem()
    const page = await sharedBook(conn)
    setDeviceIdForTests('A')
    bindFavouriteWriter(a)
    expect(toggleFavourite(page.id)).toBe(true)
    await pause()
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    expect((await b.pages.get(page.id))?.favourite?.on).toBe(true)

    // Device B's list is rebuilt from the page (what favouriteSync does).
    favourites.set([])
    const r = reconcileFavourites(
      [await b.pages.get(page.id)],
      [page.id],
      favourites.get(),
      Date.now(),
    )
    expect(r.list).toEqual([page.id])

    // Un-star on B; A hears about it.
    setDeviceIdForTests('B')
    bindFavouriteWriter(b)
    favourites.set([page.id])
    await pause()
    expect(toggleFavourite(page.id)).toBe(false)
    await pause()
    await syncOnce(b, conn, master)
    await syncOnce(a, conn, master)
    expect((await a.pages.get(page.id))?.favourite?.on).toBe(false)
  })

  it('a star on one device and a place read on the other, both offline, both survive', async () => {
    const conn = mem()
    const page = await sharedBook(conn)
    setDeviceIdForTests('A')
    bindFavouriteWriter(a)
    toggleFavourite(page.id)
    await pause()
    setDeviceIdForTests('B')
    await saveProgress(b, page.id, {
      progress: 0.9,
      at: 'pdf:90:0.0000',
      openedAt: Date.now(),
    })
    await pause()
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    await syncOnce(a, conn, master)
    for (const db of [a, b]) {
      const p = await db.pages.get(page.id)
      expect(p?.favourite?.on).toBe(true)
      expect(p?.source?.progress).toBe(0.9)
    }
  })

  it('two devices starring different pages at the same time keep both', async () => {
    const conn = mem()
    const first = await sharedBook(conn)
    setDeviceIdForTests('A')
    const nb = (await a.notebooks.toArray())[0]
    const second = await createPage(a, nb.id, null, 'Physiology')
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    bindFavouriteWriter(a)
    toggleFavourite(first.id)
    await pause()
    bindFavouriteWriter(b)
    setDeviceIdForTests('B')
    toggleFavourite(second.id)
    await pause()
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    await syncOnce(a, conn, master)
    for (const db of [a, b]) {
      expect((await db.pages.get(first.id))?.favourite?.on).toBe(true)
      expect((await db.pages.get(second.id))?.favourite?.on).toBe(true)
    }
  })
})

describe('reconcileFavourites', () => {
  const page = (id: string, favourite?: { on: boolean; at: number }) => ({
    id,
    favourite,
    deletedAt: null,
  })
  it('brings stars from other devices to the front, newest first, and keeps the rest in order', () => {
    const r = reconcileFavourites(
      [page('n1', { on: true, at: 5 }), page('n2', { on: true, at: 9 })],
      ['n1', 'n2'],
      ['x', 'y'],
      100,
    )
    expect(r.list).toEqual(['n2', 'n1', 'x', 'y'])
  })
  it('drops a page whose star was removed or that was deleted', () => {
    const r = reconcileFavourites(
      [
        page('x', { on: false, at: 5 }),
        { ...page('y', { on: true, at: 5 }), deletedAt: 1 },
      ],
      ['x', 'y'],
      ['x', 'y', 'z'],
      100,
    )
    expect(r.list).toEqual(['z'])
  })
  it('writes older local stars to their pages, in list order', () => {
    const r = reconcileFavourites(
      [page('a'), page('b')],
      ['a', 'b'],
      ['a', 'b'],
      1000,
    )
    expect(r.list).toEqual(['a', 'b'])
    expect(r.toWrite.map((w) => w.id)).toEqual(['a', 'b'])
    expect(r.toWrite[0].at).toBeGreaterThan(r.toWrite[1].at) // a is newer
  })
  it('keeps a star whose page has not arrived yet', () => {
    expect(
      reconcileFavourites([undefined], ['gone'], ['gone'], 1).list,
    ).toEqual(['gone'])
  })
})

describe('startFavouriteSync', () => {
  it('writes older local stars to their pages, then follows stars that sync brings', async () => {
    const { startFavouriteSync } = await import('../app/favouriteSync')
    const { announceApplied } = await import('./applied')
    const ws = await getOrCreateDefaultWorkspace(a)
    const nb = await createNotebook(a, ws.id, 'Books')
    const p1 = await createPage(a, nb.id, null, 'One')
    const p2 = await createPage(a, nb.id, null, 'Two')
    favourites.set([p1.id])
    const stop = startFavouriteSync(a)
    await expect
      .poll(async () => (await a.pages.get(p1.id))?.favourite?.on)
      .toBe(true)
    // A star arrives from another device.
    await a.pages.update(p2.id, { favourite: { on: true, at: Date.now() } })
    announceApplied({ table: 'pages', ids: [p2.id] })
    await expect.poll(() => favourites.get()).toEqual([p2.id, p1.id])
    // And it is taken off from another device.
    await a.pages.update(p1.id, { favourite: { on: false, at: Date.now() } })
    announceApplied({ table: 'pages', ids: [p1.id] })
    await expect.poll(() => favourites.get()).toEqual([p2.id])
    stop()
  })
})
