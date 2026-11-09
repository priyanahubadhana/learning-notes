import { noteBackup } from './attention/attentionSignals'
import { useEffect, useState, type ReactNode } from 'react'
import { db, DEFAULT_DB_NAME } from '../core/db'
import { backupGate, runAutoBackup } from '../core/autoBackup'
import {
  backupFile,
  backupFileName,
  readSnapshot,
  type BackupSnapshot,
} from '../core/upgradeBackup'
import { t } from '../i18n/t'

/** What the gate found before the app opened the database. */
type Check =
  | { kind: 'ready' }
  | { kind: 'upgrade'; snapshot: BackupSnapshot; savedInBrowser: boolean }
  | { kind: 'failed'; message: string }

// Cached so React StrictMode's double effect backs up only once.
let checkPromise: Promise<Check> | undefined

/**
 * R7-2: the backup is made silently (rolling, last 3). The person is asked
 * only when it could not be made (or the browser is nearly out of space).
 */
async function check(): Promise<Check> {
  try {
    return await checkInner()
  } finally {
    backupGate.open()
  }
}

async function checkInner(): Promise<Check> {
  try {
    const result = await runAutoBackup(
      DEFAULT_DB_NAME,
      db.verno,
      __APP_COMMIT__,
    )
    if (result.kind !== 'none') noteBackup(result.kind !== 'failed')
    if (result.kind !== 'failed') return { kind: 'ready' }
    // Still offer a file, if the data can be read at all.
    let snapshot: BackupSnapshot | undefined
    try {
      snapshot = await readSnapshot(DEFAULT_DB_NAME)
    } catch {
      snapshot = undefined
    }
    return snapshot
      ? { kind: 'upgrade', snapshot, savedInBrowser: false }
      : { kind: 'failed', message: result.message }
  } catch (error) {
    return { kind: 'failed', message: String(error) }
  }
}

/** Starts a download of the backup file. */
function download(snapshot: BackupSnapshot) {
  const url = URL.createObjectURL(backupFile(snapshot))
  const link = document.createElement('a')
  link.href = url
  link.download = backupFileName(snapshot)
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Shows the app only once its saved data is safe to open. Before a database
 * upgrade or a new app version, everything is copied silently to a rolling
 * backup in this browser (the last 3). Only when that fails does the person
 * see a question (save a file, or go on).
 */
export function UpgradeGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Check | 'checking'>('checking')
  useEffect(() => {
    checkPromise ??= check()
    void checkPromise.then(setState)
  }, [])

  if (state === 'checking') return null
  if (state.kind === 'ready') return children

  const go = () => setState({ kind: 'ready' })
  const button = 'min-h-10 rounded-lg px-4 py-2 text-sm'
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4 text-ink">
      <div
        role="dialog"
        aria-labelledby="upgrade-title"
        className="w-[min(30rem,100%)] rounded-xl border border-line p-6 shadow-[0_12px_32px_rgba(0,0,0,0.10)]"
      >
        <h1 id="upgrade-title" className="mb-2 text-lg font-semibold">
          {t('upgrade.title')}
        </h1>
        <p className="mb-3 text-sm leading-relaxed text-muted">
          {t('upgrade.message')}
        </p>
        <p className="mb-5 text-sm leading-relaxed">
          {state.kind === 'failed'
            ? t('upgrade.checkFailed', { message: state.message })
            : state.savedInBrowser
              ? t('upgrade.savedInBrowser')
              : t('upgrade.browserFailed')}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={go}
            className={`${button} border border-line hover:bg-hover`}
          >
            {t('upgrade.withoutFile')}
          </button>
          {state.kind === 'upgrade' && (
            <button
              type="button"
              autoFocus
              onClick={() => {
                download(state.snapshot)
                go()
              }}
              className={`${button} bg-accent font-medium text-white hover:opacity-90`}
            >
              {t('upgrade.saveFile')}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
