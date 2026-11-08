import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useMemo, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import type { LearningNotesDB } from '../core/db'
import type { DbColumn, JsonValue, Page } from '../core/types'
import { prefStore } from '../app/tools/store'
import { t } from '../i18n/t'
import { rowCellText } from './cellDisplay'
import { resolveRows, type ResolvedRow } from './databaseQuery'
import { getDatabase, setCell } from './databaseService'
import { studyTrackerId } from './notebookTabs'
import { setLessonStatus } from './trackerService'
import { editKind, inlineStart, inlineValue } from './views/cellEditing'
import { useMinuteClock } from '../recall/useMinuteClock'
import {
  CellPills,
  CheckCell,
  InlineEditor,
  OptionPicker,
  StarCell,
} from './views/TableCells'
import {
  LevelsCell,
  StatusPicker,
  StatusPill,
  PinMark,
} from './views/TrackerCells'
import { useDatabaseData } from './views/useDatabaseData'
import {
  CARD_LEVELS,
  levelMeaning,
  levelName,
  statusName,
} from './trackerStats'

/** The Study status row in the Review tab: open or closed (this device). */
const statusOpen = prefStore<boolean>(
  'review.statusOpen',
  (v): v is boolean => typeof v === 'boolean',
  false,
)

/**
 * The properties of a row page (or of a lesson of a notebook with a Study
 * tracker), shown above its notes: one line per column, edited in place
 * like in the Table. Shows nothing for ordinary pages.
 */
export function RowProperties({
  db,
  page,
  where = 'top',
}: {
  db: LearningNotesDB
  page: Page
  /**
   * 'top': above the notes (nothing for a lesson with a study status, which
   * lives in the Review tab); 'review': only that study status, as a closed row.
   */
  where?: 'top' | 'review'
}) {
  const databaseId = useLiveQuery(async () => {
    if (page.databaseId) return page.databaseId
    if (page.parentId !== null) return null
    const id = studyTrackerId(page.notebookId)
    return (await getDatabase(db, id)) ? id : null
  }, [db, page.id, page.databaseId, page.parentId, page.notebookId])
  const database = useLiveQuery(
    async () =>
      databaseId ? ((await getDatabase(db, databaseId)) ?? null) : null,
    [db, databaseId],
  )
  if (!database) return null
  return <Properties db={db} database={database} page={page} where={where} />
}

function Properties({
  db,
  database,
  page,
  where,
}: {
  db: LearningNotesDB
  database: NonNullable<Awaited<ReturnType<typeof getDatabase>>>
  page: Page
  where: 'top' | 'review'
}) {
  const open = statusOpen.useValue()
  const [why, setWhy] = useState(false)
  const ui = useContext(AppUiContext)
  const now = useMinuteClock()
  const data = useDatabaseData(db, database, now)
  const [editing, setEditing] = useState<string | null>(null)
  const [pick, setPick] = useState<{
    columnId: string
    anchor: HTMLElement
  } | null>(null)
  const loaded = data?.databases.get(database.id)
  const row: ResolvedRow | undefined = useMemo(
    () =>
      data
        ? resolveRows(data, now).find((r) => r.page.id === page.id)
        : undefined,
    [data, now, page.id],
  )
  if (!data || !loaded || !row || loaded.columns.length === 0) return null
  // The study status belongs to the Review tab; other row properties stay on top.
  if ((where === 'review') !== !!row.tracker) return null

  const write = async (columnId: string, value: JsonValue) => {
    try {
      await setCell(db, page.id, columnId, value)
      return true
    } catch (e) {
      ui.toast(t('table.badValue', { detail: String((e as Error).message) }))
      return false
    }
  }
  const lineClass =
    'grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-2 py-1'
  const button =
    '-mx-1.5 min-h-8 rounded-md px-1.5 py-1 text-start hover:bg-hover'

  const control = (column: DbColumn) => {
    const value = row.values[column.id] ?? null
    const label = `${column.name}: ${rowCellText(row, column)}`
    if (row.tracker && column.type === 'trackerStatus') {
      return (
        <span className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={t('table.editCell', {
              column: column.name,
              row: page.title,
            })}
            onClick={(e) =>
              setPick({ columnId: column.id, anchor: e.currentTarget })
            }
            className={button}
          >
            <StatusPill row={row.tracker} />
          </button>
          {row.tracker.override && (
            <>
              <PinMark />
              <button
                type="button"
                onClick={() => void setLessonStatus(db, page.id, null)}
                className="text-[12.5px] text-accent hover:underline"
              >
                {t('tracker.status.backToAuto')}
              </button>
            </>
          )}
        </span>
      )
    }
    if (row.tracker && column.type === 'trackerLevels') {
      return (
        <div>
          <LevelsCell stats={row.tracker.stats} />
          {row.tracker.stats.cards > 0 && (
            <ul className="mt-1.5 grid gap-0.5 text-xs text-muted">
              {CARD_LEVELS.map((level) => (
                <li key={level}>
                  <b className="font-medium text-ink">{levelName(level)}</b>{' '}
                  {levelMeaning(level)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    }
    const kind = editKind(column)
    if (editing === column.id && kind === 'inline') {
      return (
        <InlineEditor
          column={column}
          label={label}
          initial={inlineStart(row, column)}
          onCancel={() => setEditing(null)}
          onSave={(typed) => {
            setEditing(null)
            const stored = inlineValue(typed, column)
            if (stored === undefined) {
              ui.toast(t('table.badValue', { detail: typed }))
            } else void write(column.id, stored)
          }}
        />
      )
    }
    switch (kind) {
      case 'none':
        return <span className="py-1">{rowCellText(row, column)}</span>
      case 'checkbox':
        return (
          <CheckCell
            checked={value === true}
            label={label}
            onSet={(checked) => write(column.id, checked)}
          />
        )
      case 'stars':
        return (
          <StarCell
            column={column}
            value={value}
            label={label}
            onSet={(stars) => void write(column.id, stars)}
          />
        )
      case 'picker':
        return (
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={label}
            onClick={(e) =>
              setPick({ columnId: column.id, anchor: e.currentTarget })
            }
            className={button}
          >
            <CellPills column={column} value={value} />
            {rowCellText(row, column) === '' && (
              <span className="text-muted">{t('properties.empty')}</span>
            )}
          </button>
        )
      case 'inline':
        return (
          <button
            type="button"
            aria-label={label}
            onClick={() => setEditing(column.id)}
            className={`${button} w-full`}
          >
            {rowCellText(row, column) || (
              <span className="text-muted">{t('properties.empty')}</span>
            )}
          </button>
        )
    }
  }

  const picked = pick && loaded.columns.find((c) => c.id === pick.columnId)
  const stats = row.tracker?.stats
  const pct =
    stats && stats.answered > 0
      ? ` · ${Math.round((stats.correct / stats.answered) * 100)}%`
      : ''
  const summary = row.tracker
    ? `${t('study.status.title')}: ${statusName(row.tracker.status)} · ${t('study.status.due', { n: stats?.due ?? 0 })}${pct}`
    : ''
  return (
    <section
      aria-label={row.tracker ? t('study.status.title') : t('properties.title')}
      className="mb-4 rounded-xl border border-line px-3.5 py-2 text-[13.5px]"
    >
      {row.tracker && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-study-status-toggle
            aria-expanded={open}
            onClick={() => statusOpen.set(!open)}
            className="-mx-1.5 min-h-11 flex-1 rounded-md px-1.5 text-start hover:bg-hover"
          >
            <span aria-hidden>{open ? '▾' : '▸'}</span> {summary}
          </button>
          <button
            type="button"
            aria-label={t('study.status.why')}
            aria-pressed={why}
            onClick={() => setWhy(!why)}
            className="grid min-h-11 min-w-11 place-items-center rounded-md hover:bg-hover"
          >
            ⓘ
          </button>
        </div>
      )}
      {row.tracker && why && (
        <p data-study-status-why className="pb-1 text-xs text-muted">
          {t('help.line.tracker.statusRule')}
        </p>
      )}
      {(!row.tracker || open) &&
        loaded.columns.map((column) => (
          <div key={column.id} className={lineClass}>
            <span className="py-1 text-muted">{column.name}</span>
            <div className="min-w-0">{control(column)}</div>
          </div>
        ))}
      {pick && picked && row.tracker && picked.type === 'trackerStatus' && (
        <StatusPicker
          row={row.tracker}
          anchor={pick.anchor}
          onSet={(status) => void setLessonStatus(db, page.id, status)}
          onClose={() => setPick(null)}
        />
      )}
      {pick && picked && picked.type !== 'trackerStatus' && (
        <OptionPicker
          db={db}
          data={data}
          column={picked}
          row={row}
          anchor={pick.anchor}
          onSet={async (value) => {
            await write(picked.id, value)
          }}
          onClose={() => setPick(null)}
        />
      )}
    </section>
  )
}
