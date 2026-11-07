import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import type { LearningNotesDB } from '../../core/db'
import {
  getLockConfig,
  methodsOf,
  type LockMethods,
} from '../../core/lock/lockConfig'
import { lockChainIds } from '../../core/lock/lockService'
import {
  DEFAULT_IDLE_MINUTES,
  relockAll,
  relockExcept,
  unlockedIds,
} from '../../core/lock/lockState'
import { hasPasskey } from '../../core/lock/webauthn'
import { readDeviceSetting } from '../../settings/settingsService'
import { lockIdleSetting } from '../../settings/lockSettings'

/** The ways to unlock now (undefined for a split second while loading). */
export function useLockMethods(db: LearningNotesDB): LockMethods | undefined {
  return useLiveQuery(
    async () => methodsOf(await getLockConfig(db), hasPasskey()),
    [db],
  )
}

/**
 * Locks again when you leave a locked place, hide or close the app, or stop
 * using it for a while (Settings › Lock › Lock again after). Keeps open
 * only the things the current place belongs to.
 */
export function useAutoRelock(
  db: LearningNotesDB,
  place: { pageId?: string; notebookId?: string; databaseId?: string },
): void {
  const open = unlockedIds.useValue()

  // Leaving: keep only the ids of where you are now.
  const { pageId, notebookId, databaseId } = place
  useEffect(() => {
    let cancelled = false
    void lockChainIds(db, { pageId, notebookId, databaseId }).then((keep) => {
      if (!cancelled) relockExcept(keep)
    })
    return () => {
      cancelled = true
    }
  }, [db, pageId, notebookId, databaseId])

  // Hiding the app blanks it at once (so the app switcher snapshot shows
  // nothing) and locks again; coming back shows it.
  useEffect(() => {
    const root = document.documentElement
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (unlockedIds.get().length > 0) {
          root.setAttribute('data-app-hidden', '')
          relockAll()
        }
      } else {
        root.removeAttribute('data-app-hidden')
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', relockAll)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', relockAll)
    }
  }, [])

  // Idle time: lock again after a while without use.
  useEffect(() => {
    if (open.length === 0) return
    const minutes = (): number => {
      try {
        return readDeviceSetting(lockIdleSetting) || DEFAULT_IDLE_MINUTES
      } catch {
        return DEFAULT_IDLE_MINUTES
      }
    }
    let timer = setTimeout(relockAll, minutes() * 60_000)
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(relockAll, minutes() * 60_000)
    }
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    for (const e of events) document.addEventListener(e, reset, true)
    return () => {
      clearTimeout(timer)
      for (const e of events) document.removeEventListener(e, reset, true)
    }
  }, [open.length])
}
