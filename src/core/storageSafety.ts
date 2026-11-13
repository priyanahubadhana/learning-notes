/**
 * iPad storage safety (flag storage.safety, OFF by default).
 * Safari may clear a site's data under storage pressure unless it runs from
 * the Home Screen with storage kept; these helpers spot that case, name the
 * two storage failures (full, connection lost) and build a one-tap backup.
 * Everything here only reads; nothing deletes user data.
 */
import { isStorageFull } from '../app/errors'
import {
  backupFile,
  backupFileName,
  readSnapshot,
  type BackupSnapshot,
} from './upgradeBackup'

export interface BrowserInfo {
  userAgent: string
  maxTouchPoints: number
  /** iOS `navigator.standalone` (true when opened from the Home Screen). */
  standalone?: boolean
  /** `(display-mode: standalone)` media query result. */
  displayStandalone?: boolean
}

/** True for Safari on iPhone/iPad running in a normal tab (not installed). */
export function isSafariTab(info: BrowserInfo): boolean {
  if (info.standalone || info.displayStandalone) return false
  const ua = info.userAgent
  const iPhoneOrOldIpad = /iPhone|iPad|iPod/.test(ua)
  // iPadOS 13+ reports a Mac user agent; touch tells them apart.
  const newIpad = /Macintosh/.test(ua) && info.maxTouchPoints > 1
  return iPhoneOrOldIpad || newIpad
}

/** Reads the current browser (safe outside a browser). */
export function currentBrowser(): BrowserInfo {
  const nav = globalThis.navigator as
    (Navigator & { standalone?: boolean }) | undefined
  let displayStandalone: boolean
  try {
    displayStandalone =
      globalThis.matchMedia?.('(display-mode: standalone)').matches ?? false
  } catch {
    displayStandalone = false
  }
  return {
    userAgent: nav?.userAgent ?? '',
    maxTouchPoints: nav?.maxTouchPoints ?? 0,
    standalone: nav?.standalone,
    displayStandalone,
  }
}

const LOST_TEXT = /connection to indexed database server lost/i

/** True when Safari dropped the link to the saved notes (reload fixes it). */
export function isConnectionLost(error: unknown): boolean {
  const seen = new Set<unknown>()
  let current = error
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    const { name, message, inner } = current as {
      name?: string
      message?: string
      inner?: unknown
    }
    if (name === 'DatabaseClosedError') return true
    if (typeof message === 'string' && LOST_TEXT.test(message)) return true
    current = inner
  }
  return false
}

export type StorageProblem = 'full' | 'lost'

/** Which storage problem an error is, if any. */
export function storageProblem(error: unknown): StorageProblem | undefined {
  if (isStorageFull(error)) return 'full'
  if (isConnectionLost(error)) return 'lost'
  return undefined
}

/** A backup file ready to download: read-only copy of every table. */
export async function makeBackupDownload(
  dbName: string,
  read: (name: string) => Promise<BackupSnapshot> = readSnapshot,
): Promise<{ blob: Blob; name: string }> {
  const snapshot = await read(dbName)
  return { blob: backupFile(snapshot), name: backupFileName(snapshot) }
}
