import { useContext, useEffect, useRef } from 'react'
import { AppUiContext } from '../appUi'
import { runTask } from '../errors'
import type { LearningNotesDB } from '../../core/db'
import { isReadOnlyGate } from '../../core/readOnlyGate'
import { getOrCreateDefaultWorkspace } from '../../core/workspaceService'
import { t } from '../../i18n/t'
import { getSyncStatus, subscribeSync } from '../../sync/syncStatus'

/** Quiet time after start, and after each finished sync, before the check. */
const WAIT_MS = 3000

/**
 * Journal month repair (switch journal.monthRepair): a few seconds after the
 * app starts, and after each sync, joins month pages of the same month (see
 * src/journal/journalRepair.ts). Shows one quiet toast with Undo when it joined any.
 */
export function useJournalRepair(db: LearningNotesDB, on: boolean): void {
  const { toast } = useContext(AppUiContext)
  const toastRef = useRef(toast)
  useEffect(() => {
    toastRef.current = toast
  })
  useEffect(() => {
    if (!on) return
    let live = true
    let running = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const run = async () => {
      if (!live || running || isReadOnlyGate()) return
      running = true
      try {
        const repair = await import('../../journal/journalRepair')
        const ws = (await getOrCreateDefaultWorkspace(db)).id
        const outcome = await repair.repairJournalMonths(db, ws)
        if (!live || outcome.kind !== 'joined') return
        toastRef.current(repair.repairMessage(outcome), {
          label: t('reading.undo'),
          onSelect: () => runTask(outcome.undo()),
        })
      } finally {
        running = false
      }
    }
    const later = () => {
      clearTimeout(timer)
      timer = setTimeout(() => runTask(run()), WAIT_MS)
    }
    later()
    let synced = getSyncStatus().lastSyncedAt
    const stop = subscribeSync(() => {
      const now = getSyncStatus().lastSyncedAt
      if (now !== synced) later()
      synced = now
    })
    return () => {
      live = false
      clearTimeout(timer)
      stop()
    }
  }, [db, on])
}
