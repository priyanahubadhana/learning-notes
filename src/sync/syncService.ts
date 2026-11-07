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
import { setTracking } from './device'
import { enqueueChanged, syncOnce, type SyncReport } from './engine'
import { forgetMasterKey, loadMasterKey, saveMasterKey } from './keyVault'
import { createKey, findBundles, unlockKey } from './setup'
import { debounceMax } from './debounce'
import { onLocalWrite } from './outbox'
import { mapSyncError } from './syncProblem'

/**
 * Sync service (L4–L8): the one place the app talks to for sync. It signs
 * in, sets up or unlocks the key, and syncs on open, on return to the app,
 * on reconnect and every half minute while the app is in front (the iPad
 * cannot sync in the background). Signing in or out never deletes a note.
 */

export const POLL_MS = 10_000
export const SEND_AFTER_MS = 2_000
export const SEND_MAX_MS = 10_000
const LAST = 'learning-notes:sync.lastSyncedAt'
let master: MasterKey | null = null
let running: Promise<void> | null = null
let started = false
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
  set({
    phase: bundles.length > 0 ? 'needsKey' : 'needsSetup',
    email: account.email,
  })
}

/** Called once at app start. Cheap when sync was never set up. */
export async function startSync(db: LearningNotesDB): Promise<void> {
  if (started) return
  started = true
  const conn = getConnectors()
  set({ lastSyncedAt: readLast() })
  try {
    const url = new URL(location.href)
    if (await conn.auth.finishSignIn(url)) {
      url.search = ''
      url.hash = '#/settings/sync' // back to the Sync page to finish
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
  if (getSyncStatus().phase === 'ready') void syncNow(db)

  const kick = () => {
    if (document.visibilityState === 'visible') void syncNow(db)
  }
  document.addEventListener('visibilitychange', kick)
  window.addEventListener('online', kick)
  // A poll every 10 s while the app is in front (kick does nothing hidden).
  setInterval(kick, POLL_MS)
  // Local edits go out about 2 s after typing stops, at the latest 10 s
  // after the first edit of a burst.
  const soon = debounceMax(kick, SEND_AFTER_MS, SEND_MAX_MS)
  onLocalWrite(soon.call)
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
  if (forgetKey) {
    master = null
    await forgetMasterKey()
  }
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
  set({ phase: 'ready' })
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
    try {
      await enqueueChanged(db)
      const report: SyncReport = await syncOnce(db, getConnectors(), key)
      await dedupeWorkspaces(db)
      const now = Date.now()
      try {
        localStorage.setItem(LAST, String(now))
      } catch {
        // Storage blocked: the time shows for this session only.
      }
      set({
        lastSyncedAt: now,
        problem:
          report.unreadable > 0
            ? 'unreadable'
            : report.clockWarning
              ? 'clock'
              : undefined,
        needsDriveTap: report.needsDriveTap,
        mergedPages: report.mergedPages.length || getSyncStatus().mergedPages,
      })
    } catch (e) {
      set({
        // Always one of the plain problems, never the raw error text.
        problem: mapSyncError(e),
        needsDriveTap:
          e instanceof NeedsTapError || getSyncStatus().needsDriveTap,
      })
    } finally {
      set({ phase: 'ready' })
      running = null
    }
  })()
  return running
}

/** A tap on "Reconnect Drive": renews the Drive pass in a Google window. */
export async function reconnectDrive(db: LearningNotesDB): Promise<boolean> {
  const token = await getConnectors().auth.driveToken(true)
  set({ needsDriveTap: !token })
  if (token) void syncNow(db)
  return !!token
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
