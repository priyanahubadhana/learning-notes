import { runTask } from '../app/errors'
import { editLockItem } from '../app/lock/editLockMenu'
import { toggleLock } from '../app/lock/lockMenu'
import { MenuPopover, type MenuItem } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import type { Notebook } from '../core/types'
import { t } from '../i18n/t'
import { moveNotebook } from './notebookService'

/** A notebook row's ⋯ / press-and-hold menu. Loaded when first opened (keeps the first load small). */
export default function NotebookRowMenu({
  db,
  notebook,
  index,
  count,
  anchor,
  toast,
  onAddPage,
  onReview,
  onRename,
  onDelete,
  onClose,
}: {
  db: LearningNotesDB
  notebook: Notebook
  index: number
  count: number
  anchor: DOMRect
  toast: (message: string) => void
  onAddPage: () => void
  onReview: () => void
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const items: MenuItem[] = []
  if (notebook.kind !== 'journal') {
    items.push({
      label: t('sidebar.addPage.title'),
      icon: '+',
      onSelect: onAddPage,
    })
  }
  if (notebook.kind !== 'templates') {
    items.push({
      label: t('review.thisNotebook'),
      icon: '⟳',
      onSelect: onReview,
    })
  }
  items.push(
    { label: t('sidebar.rename.title'), icon: '✎', onSelect: onRename },
    {
      label: t(
        notebook.locked
          ? 'lock.menu.remove.notebook'
          : 'lock.menu.lock.notebook',
      ),
      icon: 'lock',
      onSelect: () => runTask(toggleLock(db, 'notebook', notebook.id, toast)),
    },
    editLockItem(db, 'notebook', notebook.id, !!notebook.editLocked, toast),
    {
      label: t('tree.moveUp'),
      icon: '↑',
      onSelect: () =>
        index > 0 && runTask(moveNotebook(db, notebook.id, index - 1)),
    },
    {
      label: t('tree.moveDown'),
      icon: '↓',
      onSelect: () =>
        index < count - 1 && runTask(moveNotebook(db, notebook.id, index + 1)),
    },
    {
      label: t('sidebar.deleteNotebook.title'),
      icon: '×',
      onSelect: onDelete,
      danger: true,
      disabled: !!notebook.editLocked,
      hint: notebook.editLocked ? t('editLock.deleteHint') : undefined,
    },
  )
  return <MenuPopover anchor={anchor} items={items} onClose={onClose} />
}
