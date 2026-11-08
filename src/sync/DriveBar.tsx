import { useSyncExternalStore } from 'react'
import { t } from '../i18n/t'
import type { LearningNotesDB } from '../core/db'
import { isLocked } from './lockedStatus'
import { getSyncStatus, subscribeSync } from './syncStatus'

/**
 * One clear line with one tap when Google truly needs the owner to
 * reconnect Drive (fix #4). Pictures wait in the queue meanwhile and go out
 * by themselves after the tap. Fix #6 moves this into the alerts banner.
 */
export function DriveBar({ db }: { db: LearningNotesDB }) {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  if (!status.needsDriveTap || status.phase !== 'ready' || isLocked(status))
    return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-40 flex min-h-11 items-center justify-center gap-3 bg-accent px-4 py-1 text-[13px] font-medium text-white"
    >
      <span>{t('sync.driveTap')}</span>
      <button
        type="button"
        className="min-h-9 rounded-md px-2.5 font-semibold underline underline-offset-2 hover:bg-white/15"
        onClick={() =>
          void import('./syncService').then((m) => m.reconnectDrive(db))
        }
      >
        {t('sync.reconnectDrive')}
      </button>
    </div>
  )
}
