import { useLiveQuery } from 'dexie-react-hooks'
import { createElement, useContext, useEffect } from 'react'
import { EditorContext } from '../editor/editorContext'
import { Tip } from '../help/Help'
import { t } from '../i18n/t'
import { ensureBlockView, getBlockView, setBlockViewType } from './blockViews'
import { getDatabase } from './databaseService'
import { getViewType } from './views/viewTypes'

const TYPES = ['table', 'dashboard', 'board', 'calendar', 'gallery'] as const

/**
 * Body of a "/database" block: a database shown inside a note, with the
 * block's own view (its own sorts, filters and chart settings), a switch
 * between Table / Dashboard / Board, and "Open" for the full screen.
 */
export function DatabaseBlockView({
  databaseId,
  blockId,
}: {
  databaseId: string
  blockId: string
}) {
  const app = useContext(EditorContext)
  const database = useLiveQuery(
    async () =>
      app ? ((await getDatabase(app.db, databaseId)) ?? null) : null,
    [app, databaseId],
  )
  // A database inside one of its own rows would show itself forever.
  const inOwnRow = useLiveQuery(
    async () =>
      app
        ? (await app.db.pages.get(app.pageId))?.databaseId === databaseId
        : false,
    [app, databaseId],
  )
  const view = useLiveQuery(
    async () =>
      app ? ((await getBlockView(app.db, databaseId, blockId)) ?? null) : null,
    [app, databaseId, blockId],
  )
  useEffect(() => {
    if (app && database && view === null && !inOwnRow) {
      void ensureBlockView(app.db, databaseId, blockId)
    }
  }, [app, database, view, databaseId, blockId, inOwnRow])

  if (!app || database === undefined || view === undefined) {
    return <div className="h-16 w-full" />
  }
  if (inOwnRow) {
    return (
      <p
        contentEditable={false}
        className="w-full rounded-xl border border-dashed border-line px-3 py-3 text-sm text-muted select-none"
      >
        {t('databaseBlock.loop')}
      </p>
    )
  }
  if (database === null) {
    return (
      <p
        contentEditable={false}
        className="w-full rounded-xl border border-dashed border-line px-3 py-3 text-sm text-muted select-none"
      >
        {t('databaseBlock.gone')}
      </p>
    )
  }
  const viewType = view && getViewType(view.type)
  return (
    <section
      contentEditable={false}
      aria-label={database.title}
      className="w-full rounded-xl border border-line px-3 py-2.5 select-text"
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-[14px] font-semibold">{database.title}</h3>
        {view && (
          <Tip id="db.blockViews" touchInfo={false}>
            <div
              role="group"
              aria-label={t('database.views')}
              className="inline-flex gap-0.5 rounded-[8px] bg-hover p-[2px]"
            >
              {TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={view.type === type}
                  onClick={() => void setBlockViewType(app.db, view.id, type)}
                  className="min-h-7 rounded-[6px] px-2 text-[12.5px] text-muted aria-pressed:bg-bg aria-pressed:text-ink"
                >
                  {getViewType(type)?.icon} {t(`database.view.${type}`)}
                </button>
              ))}
            </div>
          </Tip>
        )}
        {app.openDatabase && (
          <Tip id="db.blockOpen" touchInfo={false}>
            <button
              type="button"
              onClick={() => app.openDatabase?.(databaseId)}
              className="ms-auto text-[12.5px] text-accent hover:underline"
            >
              {t('databaseBlock.open')}
            </button>
          </Tip>
        )}
      </div>
      {view &&
        viewType &&
        createElement(viewType.component, {
          key: view.id,
          db: app.db,
          database,
          view,
          onOpenPage: app.openPage,
        })}
    </section>
  )
}
