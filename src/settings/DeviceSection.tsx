import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import { isStorageProtected } from '../core/storage'
import { t } from '../i18n/t'
import { dateKey, shortDayLabel } from '../journal/dates'
import { lastBackupAt } from '../share/backupReminder'
import { shortcutShiftLabel } from '../app/keys'
import { getAppActions } from '../app/tools/toolRuntime'

/** Opened from the Home Screen or as an installed app, not a browser tab. */
function isInstalled(): boolean {
  const ios = navigator as Navigator & { standalone?: boolean }
  return (
    ios.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

/** How safe the notes on this device are, and how to install the app. */
export function DeviceSection({ db }: { db: LearningNotesDB }) {
  const [isProtected, setProtected] = useState<boolean>()
  useEffect(() => {
    void isStorageProtected().then(setProtected)
  }, [])
  const backup = useLiveQuery(async () => (await lastBackupAt(db)) ?? 0, [db])

  return (
    <section
      aria-labelledby="device-title"
      className="mb-6 rounded-lg border border-line p-4 text-sm leading-relaxed"
    >
      <h2 id="device-title" className="mb-1 font-semibold">
        {t('device.title')}
      </h2>
      {isProtected !== undefined && (
        <p>{t(isProtected ? 'device.protected' : 'device.notProtected')}</p>
      )}
      {backup !== undefined && (
        <p>
          {backup
            ? t('device.lastBackup', {
                date: shortDayLabel(dateKey(new Date(backup))),
              })
            : t('device.noBackup')}
        </p>
      )}
      <p className="text-muted">
        {t('device.version', { commit: __APP_COMMIT__.slice(0, 7) })}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => getAppActions()?.openDevicePicker()}
          className="min-h-11 rounded-lg border border-line px-3 hover:bg-hover"
        >
          {t('settings.devicePicker')}
        </button>
        <button
          type="button"
          onClick={() => getAppActions()?.openControlPanel()}
          className="min-h-11 rounded-lg border border-line px-3 hover:bg-hover"
        >
          {t('settings.controlPanel', { key: shortcutShiftLabel('K') })}
        </button>
      </div>
      {!isInstalled() && (
        <div className="mt-3 border-t border-line pt-3">
          <h3 className="font-semibold">{t('device.install.title')}</h3>
          <p>{t('device.install.ipad')}</p>
          <p>{t('device.install.computer')}</p>
          <p className="mt-1 text-muted">{t('device.install.separate')}</p>
        </div>
      )}
    </section>
  )
}
