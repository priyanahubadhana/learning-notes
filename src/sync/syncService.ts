import {
  getSyncStatus,
  setSyncStatus,
  subscribeSync,
  type SyncPhase,
  type SyncStatus,
} from './syncStatus'
export { getSyncStatus, subscribeSync }
export type { SyncPhase, SyncStatus }
import type { LearningNotesDB } from '../core/db'
import { stableId } from '../core/ids'
import { isLive } from '../core/records'
import type { Workspace } from '../core/types'
import { NeedsTapError, getConnectors, type Connectors } from './connectors'
import { SyncCryptoError, type MasterKey } from './crypto'
import { setTracking, setWaitingForKey } from './device'
import { enqueueChanged, syncOnce, type SyncReport } from './engine'
import { forgetMasterKey, loadMasterKey, saveMasterKey } from './keyVault'
import { createKey, findBundles, replaceRecoveryCode, unlockKey } from './setup'
import { onboardingGuide } from '../onboarding/onboardingState'
import { debounceMax } from './debounce'
import { onLocalWrite } from './outbox'
import { mapSyncError } from './syncProblem'

/**
 * Sync service (L4–L8): the one place the app talks to for sync. It signs
 * in, sets up or unlocks the key, and syncs on open, on return to the app,
 * on reconnect, on a live ping from the server (R6-13) and by polling while
 * the app is in front (the iPad cannot sync in the background): every 10 s
 * when the live feed is closed, every minute as a safety net while it is
 * open. Signing in or out never deletes a note.
 */

export const POLL_MS = 10_000
export const POLL_LIVE_MS = 60_000
export const SEND_AFTER_MS = 2_000
export const SEND_MAX_MS = 10_000
/** Pings that arrive together (one save per block) start one pull. */
export const PING_SETTLE_MS = 150
const LAST = 'learning-notes:sync.lastSyncedAt'
let master: MasterKey | null = null
let running: Promise<void> | null = null
/** A ping came while a sync ran: run once more when it ends. */
let again = false
/** The newest server order this device has seen (pull cursor or accepted save). */
let knownSeq = 0
let lastRun = 0
/** The start-up scan for edits made while tracking was off ran. */
let scanned = false
let feedOpen = false
let stopFeed: (() => void) | null = null
const set = setSyncStatus

function readLast(): number | undefined {
  try {
    const v = Number(localStorage.getItem(LAST))
    return v > 0 ? v : undefined
  } catch {
    return undefined
  }
}

async function decidePhase(conn: Connectors) {
  const account = conn.auth.current()
  if (!account) {
    setWaitingForKey(false)
    set({ phase: 'signedOut', email: undefined })
    return
  }
  master = await loadMasterKey()
  if (master) {
    setTracking(true)
    set({ phase: 'ready', email: account.email })
    return
  }
  const bundles = await findBundles(conn)
  setWaitingForKey(bundles.length > 0)
  set({
    phase: bundles.length > 0 ? 'needsKey' : 'needsSetup',
    email: account.email,
  })
}

let booted: Promise<void> | null = null

/** Called once at app start (later calls wait for the same start). Cheap when sync was never set up. */
export function startSync(db: LearningNotesDB): Promise<void> {
  booted ??= boot(db)
  return booted
}

async function boot(db: LearningNotesDB): Promise<void> {
  const conn = getConnectors()
  set({ lastSyncedAt: readLast() })
  try {
    const url = new URL(location.href)
    if (await conn.auth.finishSignIn(url)) {
      url.search = ''
      // Back to the Sync page to finish, unless the first-run guide does it.
      if (!onboardingGuide.get()) url.hash = '#/settings/sync'
      history.replaceState(history.state, '', url.toString())
      window.dispatchEvent(
        new PopStateEvent('popstate', { state: history.state }),
      )
    }
  } catch (e) {
    set({ problem: mapSyncError(e) })
    await conn.auth.signOut()
  }
  try {
    await decidePhase(conn)
  } catch {
    set({ problem: 'offline' })
  }
  if (getSyncStatus().phase === 'ready') {
    void keepDriveFresh(true).then(() => syncNow(db))
  }
  // AI keys on all devices (R6-2): mirrored while the switch is on.
  subscribeSync(() => {
    if (getSyncStatus().phase !== 'signedOut') {
      void import('../ai/keySync').then((m) => m.startKeySync(db))
      void import('../app/tools/main/layoutSync').then((m) =>
        m.startLayoutSync(db),
      )
    }
  })
  if (getSyncStatus().phase !== 'signedOut') {
    void import('../ai/keySync').then((m) => m.startKeySync(db))
    void import('../app/tools/main/layoutSync').then((m) =>
      m.startLayoutSync(db),
    )
  }

  const kick = () => {
    if (document.visibilityState !== 'visible') return
    void keepDriveFresh(false).then(() => syncNow(db))
  }
  const poll = () => {
    // While the live feed is open a poll is only a safety net.
    if (feedOpen && Date.now() - lastRun < POLL_LIVE_MS) return
    kick()
  }
  const front = () => {
    // Coming back to the app: try the quiet Drive renewal again.
    if (document.visibilityState === 'visible') {
      void keepDriveFresh(true).then(() => syncNow(db))
    }
    openFeed(db)
  }
  document.addEventListener('visibilitychange', front)
  window.addEventListener('online', front)
  subscribeSync(() => openFeed(db))
  openFeed(db)
  setInterval(poll, POLL_MS)
  // Local edits go out about 2 s after typing stops, at the latest 10 s
  // after the first edit of a burst.
  const soon = debounceMax(kick, SEND_AFTER_MS, SEND_MAX_MS)
  onLocalWrite(soon.call)
}

/**
 * The live feed (R6-13) is open while sync is ready and the app is in front;
 * it is closed when the app is hidden (the socket would die on the iPad
 * anyway, and the server counts open connections) and when signed out.
 */
function openFeed(db: LearningNotesDB) {
  const want =
    getConnectors().changes !== undefined &&
    master !== null &&
    getSyncStatus().phase !== 'signedOut' &&
    document.visibilityState === 'visible'
  if (want === (stopFeed !== null)) return
  if (!want) {
    stopFeed?.()
    stopFeed = null
    return
  }
  let settle: ReturnType<typeof setTimeout> | null = null
  // Set before subscribing: a feed that opens at once calls back into here.
  let stop: (() => void) | null = null
  stopFeed = () => stop?.()
  stop = getConnectors().changes!.subscribe(
    (seq) => {
      if (seq > 0 && seq <= knownSeq) return // our own save, or old news
      if (settle) clearTimeout(settle)
      settle = setTimeout(() => {
        settle = null
        if (running) again = true
        else void syncNow(db)
      }, PING_SETTLE_MS)
    },
    (open) => {
      feedOpen = open
      set({ live: open })
      // Anything that happened while the feed was down is fetched now.
      if (open) void syncNow(db)
    },
  )
}

export async function signIn(): Promise<void> {
  const conn = getConnectors()
  await conn.auth.signIn() // the real one leaves the page for Google
  await decidePhase(conn)
}

/** Signs out on this device; notes stay. `forgetKey` also removes the key here. */
export async function signOut(forgetKey: boolean): Promise<void> {
  const conn = getConnectors()
  await conn.auth.signOut()
  setTracking(false)
  setWaitingForKey(false)
  if (forgetKey) {
    master = null
    await forgetMasterKey()
  }
  stopFeed?.()
  stopFeed = null
  set({ phase: 'signedOut', email: undefined, needsDriveTap: false })
}

/** First device: makes the key, returns the recovery code to print. */
export async function setUpKey(
  db: LearningNotesDB,
  passphrase: string,
): Promise<{ recoveryCode: string; spareSaved: boolean }> {
  const conn = getConnectors()
  const made = await createKey(conn, passphrase)
  await saveMasterKey(made.master)
  master = made.master
  setTracking(true)
  set({ phase: 'ready', needsDriveTap: !made.spareSaved })
  await enqueueChanged(db)
  void syncNow(db)
  return { recoveryCode: made.recoveryCode, spareSaved: made.spareSaved }
}

/**
 * Settings › Sync › Make a new recovery code: the same master key, locked with
 * a fresh code (see `replaceRecoveryCode`). Needs the unlocked key here.
 */
export async function makeNewRecoveryCode(
  passphrase: string,
): Promise<{ recoveryCode: string; oldRemoved: boolean } | null> {
  if (!master) return null
  try {
    return await replaceRecoveryCode(getConnectors(), passphrase, master.keyId)
  } catch (e) {
    if (e instanceof SyncCryptoError) return null
    throw e
  }
}

/** Another device: opens the key with the passphrase or recovery code. */
export async function unlock(
  db: LearningNotesDB,
  secret: string,
): Promise<boolean> {
  try {
    master = await unlockKey(getConnectors(), secret)
  } catch (e) {
    if (e instanceof SyncCryptoError) return false
    throw e
  }
  await saveMasterKey(master)
  setTracking(true)
  set({
    phase: 'ready',
    problem: undefined,
    arrival: { done: 0, finished: false },
  })
  // Notes already on this device are kept and sent too (never wiped).
  await enqueueChanged(db)
  void syncNow(db)
  return true
}

/** Runs one sync now (joins a running one). */
export function syncNow(db: LearningNotesDB): Promise<void> {
  if (running) return running
  if (!master || getSyncStatus().phase === 'signedOut') return Promise.resolve()
  const key = master
  running = (async () => {
    set({ phase: 'syncing' })
    lastRun = Date.now()
    try {
      // Edits made while tracking was off are found once per app start: the
      // scan reads every synced row (file bytes included), so running it on
      // every sync froze big libraries every 10 s (R6-11). While the app
      // runs, the outbox marks each save as it happens.
      if (!scanned) {
        scanned = true
        await enqueueChanged(db)
      }
      const report: SyncReport = await syncOnce(
        db,
        getConnectors(),
        key,
        (done) => {
          if (getSyncStatus().arrival)
            set({ arrival: { done, finished: false } })
        },
      )
      knownSeq = Math.max(knownSeq, report.seq)
      await dedupeWorkspaces(db)
      const now = Date.now()
      try {
        localStorage.setItem(LAST, String(now))
      } catch {
        // Storage blocked: the time shows for this session only.
      }
      set({
        arrival: getSyncStatus().arrival && {
          done: report.pulled,
          finished: true,
        },
        lastSyncedAt: now,
        problem:
          report.unreadable > 0
            ? 'unreadable'
            : report.clockWarning
              ? 'clock'
              : undefined,
        needsDriveTap: report.needsDriveTap || getSyncStatus().needsDriveTap,
        mergedPages: report.mergedPages.length || getSyncStatus().mergedPages,
      })
    } catch (e) {
      set({
        arrival: undefined,
        // Always one of the plain problems, never the raw error text.
        problem: mapSyncError(e),
        needsDriveTap:
          e instanceof NeedsTapError || getSyncStatus().needsDriveTap,
      })
    } finally {
      set({ phase: 'ready' })
      running = null
      if (again) {
        again = false
        void syncNow(db)
      }
    }
  })()
  return running
}

let driveTry = 0

/**
 * Keeps the Drive pass fresh (fix #4): renewed quietly shortly before it
 * ends, at start, on coming back to the app and before a sync. If Google
 * truly needs a tap, {@link SyncStatus.needsDriveTap} turns on (one
 * "Reconnect Drive" button, shown at the top) and pictures wait in the
 * queue; the next good pass sends them. While waiting for a tap the quiet
 * attempt is repeated at most once a minute (not on every poll).
 */
export async function keepDriveFresh(force: boolean): Promise<void> {
  const st = getSyncStatus()
  if (st.phase !== 'ready' || !master) return
  const auth = getConnectors().auth
  if (st.needsDriveTap && !force && Date.now() - driveTry < 60_000) return
  driveTry = Date.now()
  const token = await auth.driveToken(false).catch(() => null)
  if (token) {
    if (getSyncStatus().needsDriveTap) set({ needsDriveTap: false })
  } else {
    auth.prepareDrive?.() // so the Reconnect tap can open Google's window at once
    set({ needsDriveTap: true })
  }
}

/** A tap on "Reconnect Drive": renews the Drive pass in a Google window. */
export async function reconnectDrive(db: LearningNotesDB): Promise<boolean> {
  const token = await getConnectors().auth.driveToken(true)
  set({ needsDriveTap: !token })
  if (token) void syncNow(db)
  return !!token
}

/** The "All set" line has been shown. */
export function dismissArrival(): void {
  set({ arrival: undefined })
}

export function dismissMerged(): void {
  set({ mergedPages: 0 })
}

/**
 * Two devices that started before fixed ids each made their own workspace.
 * After a sync, keep one (the fixed-id one, else the oldest) and move the
 * other's notebooks into it. Nothing is deleted except the empty duplicate.
 */
async function dedupeWorkspaces(db: LearningNotesDB): Promise<void> {
  const live = (await db.workspaces.toArray()).filter(isLive)
  if (live.length >= 2) await mergeWorkspaces(db, live)
  await dedupeSpecialNotebooks(db)
}

/**
 * The same for special notebooks (Journal, Templates, Books, …): one per
 * kind; the other's pages, cards and databases move into it.
 */
async function dedupeSpecialNotebooks(db: LearningNotesDB) {
  const special = (await db.notebooks.toArray()).filter(
    (n) => isLive(n) && n.kind,
  )
  const groups = new Map<string, typeof special>()
  for (const n of special) {
    const k = `${n.workspaceId}:${n.kind}`
    groups.set(k, [...(groups.get(k) ?? []), n])
  }
  const now = Date.now()
  for (const [name, list] of groups) {
    if (list.length < 2) continue
    const fixed = stableId(name)
    const keep =
      list.find((n) => n.id === fixed) ??
      [...list].sort((a, b) => a.createdAt - b.createdAt)[0]
    await db.transaction(
      'rw',
      [db.notebooks, db.pages, db.cards, db.databases],
      async () => {
        for (const n of list) {
          if (n.id === keep.id) continue
          const moved = { notebookId: keep.id, updatedAt: now }
          await db.pages.where('notebookId').equals(n.id).modify(moved)
          await db.cards.where('notebookId').equals(n.id).modify(moved)
          await db.databases.filter((d) => d.notebookId === n.id).modify(moved)
          await db.notebooks.update(n.id, { deletedAt: now, updatedAt: now })
        }
      },
    )
  }
}

async function mergeWorkspaces(db: LearningNotesDB, live: Workspace[]) {
  const fixed = stableId('workspace:default')
  const keep =
    live.find((w) => w.id === fixed) ??
    [...live].sort((a, b) => a.createdAt - b.createdAt)[0]
  const now = Date.now()
  await db.transaction(
    'rw',
    db.workspaces,
    db.notebooks,
    db.databases,
    async () => {
      for (const w of live) {
        if (w.id === keep.id) continue
        await db.notebooks
          .where('workspaceId')
          .equals(w.id)
          .modify({ workspaceId: keep.id, updatedAt: now })
        await db.databases
          .filter((d) => d.workspaceId === w.id)
          .modify({ workspaceId: keep.id, updatedAt: now })
        await db.workspaces.update(w.id, { deletedAt: now, updatedAt: now })
      }
    },
  )
}
