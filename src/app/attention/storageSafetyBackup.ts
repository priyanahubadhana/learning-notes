import { db } from '../../core/db'
import { t } from '../../i18n/t'
import { getAppActions } from '../tools/toolRuntime'
import { makeBackupDownload } from '../../core/storageSafety'
import { recordBackupSaved } from '../../share/backupReminder'
import { shareFile, saveFile } from '../../share/export/exportService'

export interface BackupDeps {
  make: () => Promise<{ blob: Blob; name: string }>
  save: (blob: Blob, name: string) => Promise<void>
  record: () => Promise<void>
}

const realDeps = (): BackupDeps => ({
  make: () => makeBackupDownload(db.name),
  // The share sheet on iPad/iPhone; a download elsewhere.
  save: async (blob, name) => {
    if (!(await shareFile(blob, name))) saveFile(blob, name)
  },
  record: () => recordBackupSaved(db),
})

let running: Promise<boolean> | null = null

/**
 * One tap, one backup file, no questions (SS-03). A second tap while busy
 * joins the first. Reads only; the last-backup time is the existing reminder record.
 */
export function backUpNow(deps: BackupDeps = realDeps()): Promise<boolean> {
  running ??= (async () => {
    try {
      const { blob, name } = await deps.make()
      await deps.save(blob, name)
      await deps.record().catch(() => undefined)
      return true
    } catch {
      return false
    } finally {
      running = null
    }
  })()
  return running
}

export const backupBusy = (): boolean => running !== null

/** One-tap backup with its toast (SS-03); `after` = the storage-full wording. */
export async function backUpWithToast(after?: 'full'): Promise<void> {
  const ok = await backUpNow()
  const app = getAppActions()
  if (!ok) {
    app?.toast(t('storageSafety.failed'), {
      label: t('storageSafety.tryAgain'),
      onSelect: () => void backUpWithToast(after),
    })
  } else if (after === 'full') {
    app?.toast(t('storageSafety.savedShort'), {
      label: t('storageSafety.freeUp'),
      onSelect: () => app.openSettings('category:data'),
    })
  } else app?.toast(t('storageSafety.saved'))
}
