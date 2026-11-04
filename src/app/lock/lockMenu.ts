import { useContext } from 'react'
import type { LearningNotesDB } from '../../core/db'
import { lockIsSetUp } from '../../core/lock/lockConfig'
import {
  lockIsActive,
  setLocked,
  type LockKind,
} from '../../core/lock/lockService'
import { unlockedIds } from '../../core/lock/lockState'
import { t } from '../../i18n/t'
import { AppUiContext } from '../appUi'
import { runTask } from '../errors'
import { getAppActions } from '../tools/toolRuntime'
import type { MenuItem } from '../ui'
import { useLockMethods } from './useLock'

/**
 * The "Lock this page / notebook / database" menu row (or "Remove lock"
 * when it is locked). With no way to unlock set up yet, it sends the person
 * to Settings › Lock first, so nothing can be locked with no way back.
 */
export function useLockItem(
  db: LearningNotesDB,
  kind: LockKind,
  id: string,
  locked: boolean,
): MenuItem[] {
  const { toast } = useContext(AppUiContext)
  const methods = useLockMethods(db)
  unlockedIds.useValue()
  if (!methods) return []
  const onSelect = () => {
    if (locked) {
      runTask(
        setLocked(db, kind, id, false).then(() =>
          toast(t('lock.itemUnlocked')),
        ),
      )
      return
    }
    if (!lockIsSetUp(methods)) {
      toast(t('lock.needSetup'), {
        label: t('lock.openSettings'),
        onSelect: () => getAppActions()?.openSettings('lock.idleMinutes'),
      })
      return
    }
    runTask(
      setLocked(db, kind, id, true).then(() => toast(t('lock.itemLocked'))),
    )
  }
  return [
    {
      label: t(locked ? `lock.menu.remove.${kind}` : `lock.menu.lock.${kind}`),
      icon: '🔒',
      onSelect,
    },
  ]
}

/** Locks or unlocks one thing from a tool (Lock page / Lock notebook). */
export async function toggleLock(
  db: LearningNotesDB,
  kind: LockKind,
  id: string,
  toast: (
    message: string,
    action?: { label: string; onSelect: () => void },
  ) => void,
): Promise<void> {
  const table =
    kind === 'page'
      ? db.pages
      : kind === 'notebook'
        ? db.notebooks
        : db.databases
  const record = await (
    table as { get: (id: string) => Promise<{ locked?: true } | undefined> }
  ).get(id)
  const locked = !!record?.locked
  if (!locked && !(await lockIsActive(db))) {
    toast(t('lock.needSetup'), {
      label: t('lock.openSettings'),
      onSelect: () => getAppActions()?.openSettings('lock.idleMinutes'),
    })
    return
  }
  await setLocked(db, kind, id, !locked)
  toast(t(locked ? 'lock.itemUnlocked' : 'lock.itemLocked'))
}
