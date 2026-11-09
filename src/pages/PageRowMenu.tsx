import { useLiveQuery } from 'dexie-react-hooks'
import { editLockItem } from '../app/lock/editLockMenu'
import { runTask } from '../app/errors'
import { favourites, toggleFavourite } from '../app/favourites'
import { toggleLock } from '../app/lock/lockMenu'
import { MenuPopover, type MenuItem } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import { editLockSource } from '../core/editLock'
import type { Page } from '../core/types'
import { t } from '../i18n/t'

/** A page row's ⋯ / press-and-hold menu. Loaded when first opened (keeps the first load small). */
export default function PageRowMenu({
  db,
  page,
  anchor,
  toast,
  rootId,
  canMove,
  canAddSub,
  onRename,
  onAddSub,
  onMove,
  onMoveTop,
  onDelete,
  onClose,
}: {
  db: LearningNotesDB
  page: Page
  anchor: DOMRect
  toast: (message: string) => void
  rootId?: string
  canMove: boolean
  canAddSub: boolean
  onRename: () => void
  onAddSub: () => void
  /** Moves this page one step up (-1) or down (1). */
  onMove: (step: -1 | 1) => void
  /** Only given for a sub-page that may go to the top level. */
  onMoveTop?: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const starred = favourites.useValue()
  const notebook = useLiveQuery(
    () => db.notebooks.get(page.notebookId),
    [db, page.notebookId],
  )
  const editLockBy = editLockSource(page, notebook)
  const items: MenuItem[] = [
    { label: t('sidebar.rename.title'), icon: '✎', onSelect: onRename },
  ]
  if (canAddSub) {
    items.push({ label: t('tree.addSub'), icon: '+', onSelect: onAddSub })
  }
  if (!rootId) {
    const fav = starred.includes(page.id)
    items.push(
      {
        label: t(fav ? 'fav.remove' : 'fav.add'),
        icon: fav ? '★' : '☆',
        onSelect: () => toggleFavourite(page.id),
      },
      {
        label: t(page.locked ? 'lock.menu.remove.page' : 'lock.menu.lock.page'),
        icon: 'lock',
        onSelect: () => runTask(toggleLock(db, 'page', page.id, toast)),
      },
    )
  }
  if (editLockBy !== 'notebook') {
    items.push(editLockItem(db, 'page', page.id, !!page.editLocked, toast))
  }
  if (canMove) {
    items.push(
      { label: t('tree.moveUp'), icon: '↑', onSelect: () => onMove(-1) },
      { label: t('tree.moveDown'), icon: '↓', onSelect: () => onMove(1) },
    )
  }
  if (onMoveTop)
    items.push({ label: t('tree.moveTop'), icon: '↰', onSelect: onMoveTop })
  items.push({
    label: t('tree.deletePage'),
    icon: '×',
    onSelect: onDelete,
    danger: true,
    disabled: !!editLockBy,
    hint: editLockBy ? t('editLock.deleteHint') : undefined,
  })
  return <MenuPopover anchor={anchor} items={items} onClose={onClose} />
}
