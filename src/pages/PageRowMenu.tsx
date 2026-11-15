import { useLiveQuery } from 'dexie-react-hooks'
import { editLockItem } from '../app/lock/editLockMenu'
import { runTask } from '../app/errors'
import { favourites, toggleFavourite } from '../app/favourites'
import { toggleLock } from '../app/lock/lockMenu'
import type { MenuItem } from '../app/ui'
import { RowMenu } from '../app/RowStrip'
import type { RowPoint } from '../app/rowStripLogic'
import type { LearningNotesDB } from '../core/db'
import { editLockSource } from '../core/editLock'
import { useReadOnlyGate } from '../core/useReadOnlyGate'
import type { Page } from '../core/types'
import { t } from '../i18n/t'

/** A page row's ⋯ / press-and-hold menu. Loaded when first opened (keeps the first load small). */
export default function PageRowMenu({
  db,
  page,
  anchor,
  at,
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
  /** Where the long-press was (flag page.menus: the strip opens there). */
  at?: RowPoint | null
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
  useReadOnlyGate() // re-reads the lock when the sign-in changes (Q3a)
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
  if (editLockBy !== 'notebook' && editLockBy !== 'account') {
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
  return <RowMenu anchor={anchor} at={at} items={items} onClose={onClose} />
}
