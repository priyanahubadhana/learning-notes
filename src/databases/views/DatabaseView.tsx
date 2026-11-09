import { Tip } from '../../help/Help'
import { useLiveQuery } from 'dexie-react-hooks'
import { createElement, useContext, useState, type ReactNode } from 'react'
import { AppUiContext } from '../../app/appUi'
import { pushRouteParts, useRouteParts } from '../../app/router'
import { NameDialog } from '../../app/ui'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import {
  addView,
  deleteView,
  getDatabase,
  hasRows,
  listViews,
  restoreView,
  setOpenView,
  updateView,
} from '../databaseService'
import { lastViewShown, openingView } from './openingView'
import { PopHeading, PopItem, PopSeparator, Popover } from './Popover'
import { getViewType, listViewTypes } from './viewTypes'

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
  showTitle = true,
  routeIndex,
  routePrefix = [],
}: {
  db: LearningNotesDB
  databaseId: string
  onOpenPage: (pageId: string) => void
  /** Show the database's name beside the views (off when a screen shows it). */
  showTitle?: boolean
  /**
   * Where the open view sits in the address (0 = a full-screen database;
   * 2 = in a notebook's Database tab, after the tab and the database).
   * Unset = the view is not kept in the address.
   */
  routeIndex?: number
  /** The address levels before this one. */
  routePrefix?: string[]
}) {
  const database = useLiveQuery(
    async () => (await getDatabase(db, databaseId)) ?? null,
    [db, databaseId],
  )
  const views = useLiveQuery(() => listViews(db, databaseId), [db, databaseId])
  const filled = useLiveQuery(() => hasRows(db, databaseId), [db, databaseId])
  const [ownViewId, setViewId] = useState(() => lastViewShown.get(databaseId))
  const routeView = useRouteParts(routeIndex ?? 0)
  const viewId = (routeIndex !== undefined ? routeView : null) ?? ownViewId
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  const [adding, setAdding] = useState<HTMLElement | null>(null)
  const [renaming, setRenaming] = useState(false)
  const ui = useContext(AppUiContext)
  // The opening view is chosen once, when the database is opened: adding
  // the first row must not switch views under the user's hands.
  const [opened, setOpened] = useState<string | null>(null)
  const first =
    database && views && filled !== undefined
      ? openingView(views, database, filled)?.id
      : undefined
  if (first && opened === null) setOpened(first)
  if (!database || !views || filled === undefined) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }
  const view =
    views.find((v) => v.id === viewId) ??
    views.find((v) => v.id === opened) ??
    openingView(views, database, filled)
  // Views come from the registry (a stable component per view type).
  const viewType = view && getViewType(view.type)
  const show = (id: string) => {
    lastViewShown.set(databaseId, id)
    setViewId(id)
    if (routeIndex !== undefined) {
      pushRouteParts(routeIndex, id, [
        ...routePrefix,
        ...(view ? [view.id] : []),
      ])
    }
  }

  return (
    <section aria-label={database.title}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        {showTitle && (
          <h2 className="text-[15px] font-semibold">{database.title}</h2>
        )}
        <div
          role="group"
          aria-label={t('database.views')}
          className="inline-flex max-w-full gap-0.5 overflow-x-auto overflow-y-hidden rounded-[9px] bg-hover p-[3px]"
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
          <Tip id="db.addView" touchInfo={false}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={adding !== null}
              onClick={(e) => setAdding(adding ? null : e.currentTarget)}
              className="min-h-8 rounded-[7px] px-2 text-[13px] whitespace-nowrap text-muted hover:text-ink"
            >
              {t('database.addView')}
            </button>
          </Tip>
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
      {adding && (
        <Popover
          anchor={adding}
          label={t('database.addViewLabel')}
          onClose={() => setAdding(null)}
          width={220}
        >
          {listViewTypes().map((type) => (
            <PopItem
              key={type.type}
              icon={type.icon}
              label={t(type.label)}
              onClick={() => {
                setAdding(null)
                void addView(db, databaseId, {
                  name: uniqueViewName(t(type.label), views),
                  type: type.type,
                }).then((created) => show(created.id))
              }}
            />
          ))}
        </Popover>
      )}
      {renaming && view && (
        <NameDialog
          title={t('database.renameViewTitle')}
          label={t('database.renameViewLabel')}
          initialValue={view.name}
          confirmLabel={t('databases.rename')}
          onCancel={() => setRenaming(false)}
          onConfirm={(name) => {
            setRenaming(false)
            if (name.trim()) void updateView(db, view.id, { name })
          }}
        />
      )}
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
          <PopSeparator />
          <PopItem
            icon="✎"
            label={t('database.renameView')}
            onClick={() => {
              setMenu(null)
              setRenaming(true)
            }}
          />
          <PopItem
            icon="trash"
            label={t('database.deleteView')}
            onClick={() => {
              setMenu(null)
              if (!view) return
              if (views.length <= 1) {
                ui.toast(t('database.lastView'))
                return
              }
              const gone = view
              void deleteView(db, gone.id).then(() => {
                setViewId(undefined)
                ui.toast(t('database.viewDeleted', { name: gone.name }), {
                  label: t('review.undo'),
                  onSelect: () => void restoreView(db, gone.id),
                })
              })
            }}
          />
          <PopSeparator />
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
  calendar: 'db.viewCalendar',
  gallery: 'db.viewGallery',
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

/** "Board", or "Board 2" if a view of that name exists. */
function uniqueViewName(base: string, views: readonly { name: string }[]) {
  const taken = new Set(views.map((v) => v.name.toLocaleLowerCase()))
  if (!taken.has(base.toLocaleLowerCase())) return base
  for (let i = 2; ; i++) {
    if (!taken.has(`${base} ${i}`.toLocaleLowerCase())) return `${base} ${i}`
  }
}
