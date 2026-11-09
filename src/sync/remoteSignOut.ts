import Dexie from 'dexie'
import type { LearningNotesDB } from '../core/db'
import { backupFile, backupFileName, readSnapshot } from '../core/upgradeBackup'
import { downloadFile } from '../app/download'
import { forgetMasterKey } from './keyVault'

/**
 * "You were signed out" (remote sign-out). The flag is kept on this device so
 * the lock still shows after a reload. It is set only when a signed-in session
 * is ended by the server, and cleared by signing back in (after the choice),
 * by the person's own sign out, or by Start fresh. Devices that were never
 * signed in, or that chose "Use without an account", never have it.
 */
const ENDED = 'learning-notes:sync.endedRemotely'

export function readEnded(): boolean {
  try {
    return localStorage.getItem(ENDED) === '1'
  } catch {
    return false
  }
}

export function writeEnded(on: boolean): void {
  try {
    if (on) localStorage.setItem(ENDED, '1')
    else localStorage.removeItem(ENDED)
  } catch {
    // Storage blocked: the lock shows for this session only.
  }
}

/** Test switch keys survive Start fresh so a browser test can go on. */
const KEEP = 'learning-notes:sync.mock'

/**
 * Start fresh: saves one last backup file, then removes this device's notes,
 * key and settings and reloads into the empty welcome. Nothing is removed if
 * the backup could not be made. The cloud copy is not touched.
 */
export async function startFresh(db: LearningNotesDB): Promise<void> {
  const snapshot = await readSnapshot(db.name)
  downloadFile(backupFileName(snapshot), backupFile(snapshot))
  // Give the browser a moment to start saving the file.
  await new Promise((r) => setTimeout(r, 400))
  db.close()
  await Promise.race([
    Dexie.delete(db.name),
    new Promise((_, no) =>
      setTimeout(() => no(new Error('other windows are open')), 5000),
    ),
  ])
  await forgetMasterKey()
  try {
    for (const k of Object.keys(localStorage))
      if (!k.startsWith(KEEP)) localStorage.removeItem(k)
    sessionStorage.clear()
  } catch {
    // Storage blocked: nothing more to clear.
  }
  location.replace(location.pathname)
}
