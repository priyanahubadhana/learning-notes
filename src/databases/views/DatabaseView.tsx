import { Tip } from '../../help/Help'
import { useLiveQuery } from 'dexie-react-hooks'
import { createElement, useState, type ReactNode } from 'react'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import {
  getDatabase,
  hasRows,
  listViews,
  setOpenView,
} from '../databaseService'
import { lastViewShown, openingView } from './openingView'
import { PopHeading, PopItem, Popover } from './Popover'
import { getViewType } from './viewTypes'

/**
 * A database with its views: name, view switcher and the chosen view.
 * It opens on the view picked with "Always open on …", else on the
 * Dashboard once there are rows (Table while empty); while the app is
 * open it returns to the last view shown.
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
  const filled = useLiveQuery(() => hasRows(db, databaseId), [db, databaseId])
  const [viewId, setViewId] = useState(() => lastViewShown.get(databaseId))
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  if (!database || !views || filled === undefined) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }
  const view =
    views.find((v) => v.id === viewId) ?? openingView(views, database, filled)
  // Views come from the registry (a stable component per view type).
  const viewType = view && getViewType(view.type)
  const show = (id: string) => {
    lastViewShown.set(databaseId, id)
    setViewId(id)
  }

  return (
    <section aria-label={database.title}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-[15px] font-semibold">{database.title}</h2>
        <div
          role="group"
          aria-label={t('database.views')}
          className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[9px] bg-hover p-[3px]"
        >
          {views.map((v) => (
            <ViewTip key={v.id} type={v.type}>
              <button
                type="button"
                aria-pressed={v.id === view?.id}
                onClick={() => show(v.id)}
                className="min-h-8 rounded-[7px] px-2.5 text-[13px] whitespace-nowrap text-muted aria-pressed:bg-bg aria-pressed:text-ink aria-pressed:shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
              >
                <span aria-hidden className="me-1">
                  {getViewType(v.type)?.icon}
                </span>
                {v.name}
              </button>
            </ViewTip>
          ))}
          <Tip id="db.viewOptions" touchInfo={false}>
            <button
              type="button"
              aria-label={t('database.viewOptions')}
              aria-haspopup="dialog"
              aria-expanded={menu !== null}
              onClick={(e) => setMenu(menu ? null : e.currentTarget)}
              className="min-h-8 rounded-[7px] px-2 text-[13px] text-muted hover:text-ink"
            >
              ⋯
            </button>
          </Tip>
        </div>
      </div>
      {menu && (
        <Popover
          anchor={menu}
          label={t('database.viewOptions')}
          onClose={() => setMenu(null)}
        >
          <PopHeading>{t('database.openHint')}</PopHeading>
          <PopItem
            label={t('database.openAuto')}
            on={!views.some((v) => v.id === database.openViewId)}
            onClick={() => {
              setMenu(null)
              void setOpenView(db, databaseId, null)
            }}
          />
          {views.map((v) => (
            <PopItem
              key={v.id}
              icon={getViewType(v.type)?.icon}
              label={t('database.openOn', { name: v.name })}
              on={v.id === database.openViewId}
              onClick={() => {
                setMenu(null)
                void setOpenView(db, databaseId, v.id)
              }}
            />
          ))}
        </Popover>
      )}
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

const VIEW_TIPS = {
  table: 'db.viewTable',
  dashboard: 'db.viewDashboard',
  board: 'db.viewBoard',
} as const

/** A view's button with the tip that explains the view. */
function ViewTip({ type, children }: { type: string; children: ReactNode }) {
  const id = VIEW_TIPS[type as keyof typeof VIEW_TIPS]
  return id ? (
    <Tip id={id} touchInfo={false}>
      {children}
    </Tip>
  ) : (
    <>{children}</>
  )
}
