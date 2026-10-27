import { useEffect, useState, type ReactNode } from 'react'
import { db, DEFAULT_DB_NAME } from '../core/db'
import {
  backupFile,
  backupFileName,
  needsUpgrade,
  readSnapshot,
  saveBrowserBackup,
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

async function check(): Promise<Check> {
  try {
    if (!(await needsUpgrade(DEFAULT_DB_NAME, db.verno))) {
      return { kind: 'ready' }
    }
    const snapshot = await readSnapshot(DEFAULT_DB_NAME)
    let savedInBrowser = true
    try {
      await saveBrowserBackup(snapshot)
    } catch {
      savedInBrowser = false // e.g. storage full: the file is still offered
    }
    return { kind: 'upgrade', snapshot, savedInBrowser }
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
 * Shows the app only once its saved data is safe to open. When the app's
 * database version is newer than the saved one, the data is first copied
 * to a backup database in the browser, and the user may download it as a
 * file, before the upgrade runs (on the app's first database read).
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
