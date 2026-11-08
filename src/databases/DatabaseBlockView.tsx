import { DatabaseGate } from '../app/lock/LockScreen'
import { useLiveQuery } from 'dexie-react-hooks'
import { createElement, useContext, useEffect, useRef, useState } from 'react'
import { EditorContext } from '../editor/editorContext'
import { Tip } from '../help/Help'
import { t } from '../i18n/t'
import { ensureBlockView, getBlockView, setBlockViewType } from './blockViews'
import { getDatabase, updateView } from './databaseService'
import { getViewType } from './views/viewTypes'

const TYPES = [
  'table',
  'list',
  'dashboard',
  'board',
  'calendar',
  'gallery',
] as const

/** Widest a "Full width" database grows (pixels). */
const MAX_WIDE = 1400

/**
 * Body of a "/database" block: a database shown inside a note, with the
 * block's own view (its own sorts, filters and chart settings), a switch
 * between Table / Dashboard / Board, and "Open" for the full screen.
 */
/** A database inside a note; a locked database shows a lock instead. */
export function DatabaseBlockView(props: {
  databaseId: string
  blockId: string
}) {
  const app = useContext(EditorContext)
  if (!app) return <div className="h-16 w-full" />
  return (
    <DatabaseGate db={app.db} databaseId={props.databaseId} compact>
      <DatabaseBlock {...props} />
    </DatabaseGate>
  )
}

function DatabaseBlock({
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
  // "Full width": the block grows past the text column to the page's width.
  const box = useRef<HTMLElement>(null)
  const fullWidth = view?.config.fullWidth === true
  const [wide, setWide] = useState<{ width: number; shift: number } | null>(
    null,
  )
  const shown = !!database && !!view
  useEffect(() => {
    const el = box.current
    const parent = el?.parentElement
    const area = el?.closest('main')
    if (!fullWidth || !el || !parent || !area) {
      setWide(null)
      return
    }
    const measure = () => {
      const width = Math.min(area.clientWidth - 32, MAX_WIDE)
      const own = parent.clientWidth
      setWide(width > own ? { width, shift: (own - width) / 2 } : null)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(area)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [fullWidth, shown])
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
      ref={box}
      contentEditable={false}
      aria-label={database.title}
      style={
        wide
          ? {
              width: wide.width,
              marginInlineStart: wide.shift,
              marginInlineEnd: wide.shift,
            }
          : undefined
      }
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
        {view && (
          <Tip id="db.blockWide" touchInfo={false}>
            <button
              type="button"
              aria-pressed={fullWidth}
              onClick={() => {
                const config = { ...view.config }
                if (fullWidth) delete config.fullWidth
                else config.fullWidth = true
                void updateView(app.db, view.id, { config })
              }}
              className="min-h-7 rounded-md border border-line px-2 text-[12.5px] text-muted hover:text-ink aria-pressed:border-accent aria-pressed:text-accent"
            >
              ⇔ {t('databaseBlock.fullWidth')}
            </button>
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
