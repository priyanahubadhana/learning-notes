import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { MenuPopover } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import { Tip } from '../help/Help'
import { t } from '../i18n/t'
import {
  deleteDatabase,
  getDatabase,
  listDatabases,
  listRows,
  renameDatabase,
} from './databaseService'
import {
  createStarterDatabase,
  starterName,
  STARTER_IDS,
} from './starterDatabases'
import { DatabaseView } from './views/DatabaseView'

/** "All databases": every database of the workspace, with its row count. */
export function DatabasesScreen({
  db,
  workspaceId,
  onOpenDatabase,
  onClose,
}: {
  db: LearningNotesDB
  workspaceId: string
  onOpenDatabase: (id: string) => void
  onClose: () => void
}) {
  const [menu, setMenu] = useState<DOMRect | null>(null)
  const items = useLiveQuery(async () => {
    const databases = await listDatabases(db, workspaceId)
    return Promise.all(
      databases.map(async (database) => ({
        database,
        rows: (await listRows(db, database.id)).length,
        notebook: database.notebookId
          ? (await db.notebooks.get(database.notebookId))?.title
          : undefined,
      })),
    )
  }, [db, workspaceId])

  return (
    <div className="phone:fixed phone:inset-0 phone:z-30 phone:overflow-auto phone:bg-bg">
      <div className="mx-auto max-w-[920px] px-4 pt-8 pb-24 phone:pt-3 md:px-12 md:pt-12">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="flex-1 text-[26px] leading-tight font-bold tracking-[-0.02em]">
            {t('databases.title')}
          </h1>
          <Tip id="databases.new" touchInfo={false}>
            <button
              type="button"
              onClick={(e) => setMenu(e.currentTarget.getBoundingClientRect())}
              aria-haspopup="menu"
              className="min-h-9 rounded-lg bg-accent px-3 text-[13px] font-medium text-white hover:opacity-90"
            >
              {t('databases.new')}
            </button>
          </Tip>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('databases.close')}
            className="hidden size-11 items-center justify-center rounded-lg text-lg text-muted hover:bg-hover hover:text-ink phone:flex"
          >
            ×
          </button>
        </div>
        {items && items.length === 0 && (
          <p className="text-sm text-muted">{t('databases.empty')}</p>
        )}
        <ul className="grid gap-2">
          {items?.map(({ database, rows, notebook }) => (
            <li key={database.id}>
              <button
                type="button"
                onClick={() => onOpenDatabase(database.id)}
                className="flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-0.5 rounded-xl border border-line px-4 py-2 text-start hover:border-accent"
              >
                <span className="font-semibold">{database.title}</span>
                {database.kind === 'studyTracker' && (
                  <span className="rounded bg-hover px-1.5 text-[11px] text-muted">
                    {t('databases.tracker')}
                  </span>
                )}
                <span className="text-[12.5px] text-muted">
                  {t(
                    database.kind === 'studyTracker'
                      ? 'databases.lessons'
                      : 'databases.rows',
                    { count: rows },
                  )}
                  {' · '}
                  {notebook
                    ? t('databases.inNotebook', { name: notebook })
                    : t('databases.loose')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {menu && (
        <MenuPopover
          anchor={menu}
          onClose={() => setMenu(null)}
          items={STARTER_IDS.map((id) => ({
            label: starterName(id),
            icon: '▤',
            onSelect: () =>
              runTask(
                createStarterDatabase(db, workspaceId, null, id).then(
                  (database) => onOpenDatabase(database.id),
                ),
              ),
          }))}
        />
      )}
    </div>
  )
}

/** One database full screen: its name, its views, delete (not for a Study tracker). */
export function DatabaseScreen({
  db,
  databaseId,
  onOpenPage,
  onBack,
}: {
  db: LearningNotesDB
  databaseId: string
  onOpenPage: (pageId: string) => void
  onBack: () => void
}) {
  const ui = useContext(AppUiContext)
  const database = useLiveQuery(
    async () => (await getDatabase(db, databaseId)) ?? null,
    [db, databaseId],
  )
  if (database === undefined) return null
  if (database === null) {
    return (
      <div className="px-12 pt-12">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-accent hover:underline"
        >
          {t('databases.back')}
        </button>
      </div>
    )
  }
  const tracker = database.kind === 'studyTracker'
  return (
    <div className="phone:fixed phone:inset-0 phone:z-30 phone:overflow-auto phone:bg-bg">
      <div className="mx-auto max-w-[1040px] px-4 pt-8 pb-24 phone:pt-3 md:px-12 md:pt-12">
        <button
          type="button"
          onClick={onBack}
          className="mb-1 text-xs text-muted hover:text-ink"
        >
          ← {t('databases.back')}
        </button>
        <div className="mb-4 flex items-center gap-2">
          {tracker ? (
            <h1 className="flex-1 text-[26px] leading-tight font-bold tracking-[-0.02em]">
              {database.title}
            </h1>
          ) : (
            <input
              aria-label={t('databases.rename')}
              defaultValue={database.title}
              key={database.title}
              onBlur={(e) => {
                const title = e.currentTarget.value.trim()
                if (title && title !== database.title) {
                  runTask(renameDatabase(db, database.id, title))
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="min-w-0 flex-1 bg-transparent text-[26px] leading-tight font-bold tracking-[-0.02em] outline-none"
            />
          )}
          {!tracker && (
            <button
              type="button"
              onClick={() =>
                runTask(
                  deleteDatabase(db, database.id).then(() => {
                    ui.toast(t('databases.deleted', { name: database.title }))
                    onBack()
                  }),
                )
              }
              className="min-h-9 rounded-lg border border-line px-3 text-[13px] text-danger hover:border-danger"
            >
              {t('databases.delete')}
            </button>
          )}
        </div>
        <DatabaseView db={db} databaseId={databaseId} onOpenPage={onOpenPage} />
      </div>
    </div>
  )
}
