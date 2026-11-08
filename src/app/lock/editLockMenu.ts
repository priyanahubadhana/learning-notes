import { runTask } from '../errors'
import type { LearningNotesDB } from '../../core/db'
import { setEditLocked } from '../../core/editLock'
import { t } from '../../i18n/t'
import type { MenuItem } from '../ui'

/**
 * The "Lock editing" / "Unlock editing" menu row of a page or a notebook
 * (queue 3c). Separate from the privacy lock rows: no passcode, one tap.
 */
export function editLockItem(
  db: LearningNotesDB,
  kind: 'page' | 'notebook',
  id: string,
  locked: boolean,
  toast: (message: string) => void,
): MenuItem {
  return {
    label: t(
      locked
        ? 'editLock.menu.unlock'
        : kind === 'page'
          ? 'editLock.menu.lock'
          : 'editLock.menu.lockNotebook',
    ),
    icon: locked ? '🔓' : '🔏',
    onSelect: () =>
      runTask(
        setEditLocked(db, kind, id, !locked).then(() =>
          toast(t(locked ? 'editLock.unlocked' : 'editLock.locked')),
        ),
      ),
  }
}
