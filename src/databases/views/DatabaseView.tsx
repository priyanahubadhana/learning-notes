import { useLiveQuery } from 'dexie-react-hooks'
import { createElement } from 'react'
import { isStringOrNull } from '../../app/uiPrefs'
import { usePref } from '../../app/usePref'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { getDatabase, listViews } from '../databaseService'
import { getViewType } from './viewTypes'

/**
 * A database with its views: name, view switcher and the chosen view.
 * The chosen view is remembered per database on this device.
 */
export function DatabaseView({
  db,
  databaseId,
  onOpenPage,
}: {
  db: LearningNotesDB
  databaseId: string
  onOpenPage: (pageId: string) => void
}) {
  const database = useLiveQuery(
    async () => (await getDatabase(db, databaseId)) ?? null,
    [db, databaseId],
  )
  const views = useLiveQuery(() => listViews(db, databaseId), [db, databaseId])
  const [viewId, setViewId] = usePref(
    `dbView:${databaseId}`,
    isStringOrNull,
    null,
  )
  if (!database || !views) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }
  const view = views.find((v) => v.id === viewId) ?? views[0]
  // Views come from the registry (a stable component per view type).
  const viewType = view && getViewType(view.type)

  return (
    <section aria-label={database.title}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-[15px] font-semibold">{database.title}</h2>
        <div
          role="group"
          aria-label={t('database.views')}
          className="inline-flex flex-wrap gap-0.5 rounded-[9px] bg-hover p-[3px]"
        >
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={v.id === view?.id}
              onClick={() => setViewId(v.id)}
              className="min-h-8 rounded-[7px] px-2.5 text-[13px] whitespace-nowrap text-muted aria-pressed:bg-bg aria-pressed:text-ink aria-pressed:shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            >
              <span aria-hidden className="me-1">
                {getViewType(v.type)?.icon}
              </span>
              {v.name}
            </button>
          ))}
        </div>
      </div>
      {view &&
        viewType &&
        createElement(viewType.component, {
          key: view.id,
          db,
          database,
          view,
          onOpenPage,
        })}
    </section>
  )
}
