import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { runTask } from '../app/errors'
import { ConfirmDialog, IconButton } from '../app/ui'
import { isBoolean } from '../app/uiPrefs'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import {
  listTrash,
  purgeDatabase,
  purgeNotebook,
  purgePage,
  restoreDatabase,
  restoreNotebook,
  restorePage,
  type TrashItem,
} from './trashService'

interface TrashSectionProps {
  db: LearningNotesDB
  workspaceId: string
}

/** Collapsible "Trash" list at the end of the sidebar. Updates live. */
export function TrashSection({ db, workspaceId }: TrashSectionProps) {
  const items = useLiveQuery(
    () => listTrash(db, workspaceId),
    [db, workspaceId],
  )
  const [open, setOpen] = usePref('trashOpen', isBoolean, false)
  const [purging, setPurging] = useState<TrashItem | null>(null)

  const restore = (item: TrashItem) =>
    runTask(
      item.kind === 'notebook'
        ? restoreNotebook(db, item.id)
        : item.kind === 'database'
          ? restoreDatabase(db, item.id)
          : restorePage(db, item.id),
    )
  const purge = (item: TrashItem) =>
    runTask(
      item.kind === 'notebook'
        ? purgeNotebook(db, item.id)
        : item.kind === 'database'
          ? purgeDatabase(db, item.id)
          : purgePage(db, item.id),
    )

  const count = items?.length ?? 0
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] tracking-[0.06em] text-muted uppercase hover:bg-hover"
      >
        <span aria-hidden className="w-3 text-[10px]">
          {open ? '▾' : '▸'}
        </span>
        Trash{count > 0 && ` · ${count}`}
      </button>

      {open && count === 0 && (
        <p className="px-2.5 py-1 pl-7 text-xs text-muted">Trash is empty</p>
      )}
      {open &&
        items?.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-1.5 rounded-md py-1 pr-2 pl-5 text-sm hover:bg-hover"
          >
            <span aria-hidden className="w-4 text-center text-xs">
              {item.kind === 'notebook'
                ? '📓'
                : item.kind === 'database'
                  ? '🗃️'
                  : '📄'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-muted">
                {item.title || 'Untitled'}
              </span>
              <span className="block truncate text-[11px] text-muted/80">
                {item.kind === 'notebook'
                  ? `${item.pageCount} page${item.pageCount === 1 ? '' : 's'}`
                  : item.kind === 'database'
                    ? t('trash.databaseRows', { count: item.rowCount })
                    : `in ${item.notebookTitle || 'Untitled'}`}
              </span>
            </span>
            <span className="flex opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
              <IconButton
                title="Restore"
                tip="sidebar.restore"
                onClick={() => restore(item)}
              >
                ↺
              </IconButton>
              <IconButton
                title="Delete forever"
                tip="sidebar.deleteForever"
                onClick={() => setPurging(item)}
              >
                ×
              </IconButton>
            </span>
          </div>
        ))}

      {purging && (
        <ConfirmDialog
          message={`Delete “${purging.title || 'Untitled'}” forever? ${
            purging.kind === 'notebook'
              ? 'Its pages will be deleted too. '
              : purging.kind === 'database'
                ? `${t('trash.databaseRowsToo')} `
                : ''
          }This can’t be undone.`}
          confirmLabel="Delete forever"
          onCancel={() => setPurging(null)}
          onConfirm={() => {
            setPurging(null)
            purge(purging)
          }}
        />
      )}
    </div>
  )
}
