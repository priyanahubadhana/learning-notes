import type { ReactNode } from 'react'
import { useContext, useMemo, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import type { DbColumn, JsonValue } from '../../core/types'
import { t, type MessageKey } from '../../i18n/t'
import { createPage } from '../../pages/pageService'
import { useMinuteClock } from '../../recall/useMinuteClock'
import { rowCellText } from '../cellDisplay'
import { setLessonStatus } from '../trackerService'
import { TITLE_COLUMN_ID } from '../columnTypes'
import { queryRows, resolveRows, type ResolvedRow } from '../databaseQuery'
import {
  addRow,
  setCell,
  titleColumnName,
  updateView,
} from '../databaseService'
import { editKind, inlineStart, inlineValue } from './cellEditing'
import { ColumnDialog, type ColumnTarget } from './ColumnDialog'
import { filterLabel, sortLabels } from './columnFilters'
import { columnIcon, isAutoColumn, typeName } from './columnLook'
import { ColumnMenu } from './ColumnMenu'
import { PopHeading, PopItem, PopSeparator, Popover } from './Popover'
import { HelpLine, Tip } from '../../help/Help'
import { LevelsCell, PinMark, StatusPicker, StatusPill } from './TrackerCells'
import { headerTip, statusTip } from './trackerTips'
import {
  CellPills,
  CheckCell,
  InlineEditor,
  OptionPicker,
  StarCell,
} from './TableCells'
import {
  knownQuery,
  readHidden,
  readRowQuery,
  withFilter,
  withHidden,
  withoutQuery,
  withSort,
} from './viewConfig'
import { useDatabaseData } from './useDatabaseData'
import type { ViewProps } from './viewTypes'

/** Rows drawn at first, and added per "Show more" (keeps big tables fast). */
const PAGE_SIZE = 100

/** Column types offered by "+ Column", then under "More types". */
const BASIC_TYPES = [
  'text',
  'number',
  'date',
  'choice',
  'choices',
  'checkbox',
  'url',
  'tag',
  'noteLink',
]
const MORE_TYPES = ['formula', 'relation', 'rollup']
const TYPE_HINTS = new Set([
  'number',
  'choice',
  'choices',
  'tag',
  'noteLink',
  'formula',
  'relation',
  'rollup',
])

/** The open popover, next to the button that opened it. */
type Menu =
  | { kind: 'column'; columnId: string; anchor: HTMLElement }
  | { kind: 'add'; more: boolean; anchor: HTMLElement }
  | { kind: 'hidden'; anchor: HTMLElement }
  | { kind: 'pick'; rowId: string; columnId: string; anchor: HTMLElement }

const typeLabel = (type: string) => ({
  icon: columnIcon({ type, config: {} } as DbColumn),
  label: typeName(type),
  hint: TYPE_HINTS.has(type)
    ? t(`column.typeHint.${type}` as MessageKey)
    : undefined,
})

/**
 * Table view: one row per database row, one column per database column.
 * Cells are edited in place; a column's header opens its menu (sort,
 * filter, hide, edit). Sorts, filters and hidden columns are saved in the
 * view, and shown as chips above the table.
 */
export function TableView({ db, database, view, onOpenPage }: ViewProps) {
  const ui = useContext(AppUiContext)
  const now = useMinuteClock()
  const data = useDatabaseData(db, database, now)
  const [shown, setShown] = useState(PAGE_SIZE)
  const [editing, setEditing] = useState<{
    rowId: string
    columnId: string
  } | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [dialog, setDialog] = useState<ColumnTarget | null>(null)

  const allColumns = data?.databases.get(database.id)?.columns
  const { all, rows, query } = useMemo(() => {
    const columns = data?.databases.get(database.id)?.columns
    if (!data || !columns) return { all: [], rows: [], query: {} }
    const ids = new Set([TITLE_COLUMN_ID, ...columns.map((c) => c.id)])
    const query = knownQuery(readRowQuery(view.config), ids)
    const all = resolveRows(data, now)
    return { all, rows: queryRows(all, columns, query), query }
  }, [data, database.id, now, view.config])
  if (!data || !allColumns) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }

  const hidden = readHidden(view.config)
  const columns = allColumns.filter((c) => !hidden.includes(c.id))
  const hiddenColumns = allColumns.filter((c) => hidden.includes(c.id))
  const columnById = new Map(allColumns.map((c) => [c.id, c]))
  const titleName = titleColumnName(database)
  const nameOf = (id: string) =>
    id === TITLE_COLUMN_ID ? titleName : (columnById.get(id)?.name ?? '')
  const sort = query.sorts?.[0]
  const filters = query.filters ?? []
  const tracker = database.kind === 'studyTracker'

  const saveConfig = (config: typeof view.config) =>
    void updateView(db, view.id, { config })
  const toggleMenu = (next: Menu) =>
    setMenu(
      menu && menu.anchor === next.anchor && menu.kind === next.kind
        ? null
        : next,
    )
  const write = async (rowId: string, columnId: string, value: JsonValue) => {
    try {
      await setCell(db, rowId, columnId, value)
      return true
    } catch (e) {
      ui.toast(t('table.badValue', { detail: String((e as Error).message) }))
      return false
    }
  }
  const newRow = async () => {
    const page =
      tracker && database.notebookId
        ? await createPage(db, database.notebookId, null, '')
        : await addRow(db, database.id)
    setShown(Math.max(shown, rows.length + 1))
    setEditing({ rowId: page.id, columnId: TITLE_COLUMN_ID })
  }
  const rowTitle = (row: ResolvedRow) => row.page.title || t('review.untitled')

  const head =
    'whitespace-nowrap border-b border-line px-2 py-1.5 text-start text-xs font-medium text-muted'
  const cell = 'border-b border-line px-3 py-2 align-top'
  const cellButton =
    '-mx-1.5 -my-1 block min-h-8 w-[calc(100%+0.75rem)] rounded-md px-1.5 py-1 text-start hover:bg-hover'

  const headerButton = (columnId: string, column: DbColumn | null) => {
    const open = menu?.kind === 'column' && menu.columnId === columnId
    const filtered = filters.some((f) => f.columnId === columnId)
    return (
      <HeaderTip column={column} tracker={tracker}>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={(e) =>
            toggleMenu({ kind: 'column', columnId, anchor: e.currentTarget })
          }
          className="flex min-h-8 items-center gap-1.5 rounded-md px-1 hover:bg-hover hover:text-ink"
        >
          <span aria-hidden>{column ? columnIcon(column) : '↗'}</span>
          {nameOf(columnId)}
          {column && isAutoColumn(column) && (
            <span className="rounded bg-hover px-1 py-px text-[10.5px]">
              {t('database.auto')}
            </span>
          )}
          {sort?.columnId === columnId && (
            <span aria-hidden className="text-accent">
              {sort.direction === 'asc' ? '↑' : '↓'}
            </span>
          )}
          {filtered && (
            <span aria-hidden className="text-accent">
              ⏷
            </span>
          )}
        </button>
      </HeaderTip>
    )
  }

  const renderCell = (row: ResolvedRow, column: DbColumn) => {
    const value = row.values[column.id] ?? null
    const context = { column: column.name, row: rowTitle(row) }
    const text = rowCellText(row, column)
    const kind = editKind(column)
    if (row.tracker) {
      if (column.type === 'trackerStatus') {
        return (
          <span className="flex items-center gap-1">
            <Tip id={statusTip(row.tracker.status)} className="flex-1">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={`${t('table.editCell', context)}: ${text}`}
                onClick={(e) =>
                  toggleMenu({
                    kind: 'pick',
                    rowId: row.page.id,
                    columnId: column.id,
                    anchor: e.currentTarget,
                  })
                }
                className={cellButton}
              >
                <StatusPill row={row.tracker} />
              </button>
            </Tip>
            {row.tracker.override && <PinMark />}
          </span>
        )
      }
      if (column.type === 'trackerLevels') {
        return <LevelsCell stats={row.tracker.stats} />
      }
      if (column.type === 'trackerCardsDue') return text
    }
    if (
      editing?.rowId === row.page.id &&
      editing.columnId === column.id &&
      kind === 'inline'
    ) {
      return (
        <InlineEditor
          column={column}
          label={t('table.cellValue', context)}
          initial={inlineStart(row, column)}
          onCancel={() => setEditing(null)}
          onSave={(typed) => {
            setEditing(null)
            const stored = inlineValue(typed, column)
            if (stored === undefined) {
              ui.toast(t('table.badValue', { detail: typed }))
            } else void write(row.page.id, column.id, stored)
          }}
        />
      )
    }
    const editLabel = `${t('table.editCell', context)}${text ? `: ${text}` : ''}`
    switch (kind) {
      case 'none':
        return text
      case 'checkbox':
        return (
          <CheckCell
            checked={value === true}
            label={t('table.cellValue', context)}
            onSet={(checked) => write(row.page.id, column.id, checked)}
          />
        )
      case 'stars':
        return (
          <StarCell
            column={column}
            value={value}
            label={t('table.cellValue', context)}
            onSet={(stars) => void write(row.page.id, column.id, stars)}
          />
        )
      case 'picker':
        return (
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={editLabel}
            onClick={(e) =>
              toggleMenu({
                kind: 'pick',
                rowId: row.page.id,
                columnId: column.id,
                anchor: e.currentTarget,
              })
            }
            className={cellButton}
          >
            <CellPills column={column} value={value} />
          </button>
        )
      case 'inline':
        return (
          <span className="flex items-start gap-1">
            <button
              type="button"
              aria-label={editLabel}
              onClick={() =>
                setEditing({ rowId: row.page.id, columnId: column.id })
              }
              className={`${cellButton} ${column.type === 'url' ? 'truncate text-accent' : ''}`}
            >
              {text}
            </button>
            {column.type === 'url' && text && (
              <a
                href={text}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('table.openLink')}
                className="shrink-0 px-1 text-muted hover:text-accent"
              >
                ↗
              </a>
            )}
          </span>
        )
    }
  }

  const pickRow =
    menu?.kind === 'pick' ? all.find((r) => r.page.id === menu.rowId) : null
  const pickColumn =
    menu?.kind === 'pick' ? columnById.get(menu.columnId) : undefined
  const menuColumnId = menu?.kind === 'column' ? menu.columnId : null
  const menuColumn =
    menuColumnId === null ? undefined : (columnById.get(menuColumnId) ?? null)

  const chip =
    'inline-flex min-h-8 items-center gap-1 rounded-full border border-line ps-3 pe-1 text-[12.5px]'
  const chipX =
    'min-h-7 min-w-7 rounded-full text-muted hover:bg-hover hover:text-ink'
  const [up, down] = sort
    ? sortLabels(
        sort.columnId === TITLE_COLUMN_ID
          ? null
          : (columnById.get(sort.columnId) ?? null),
      )
    : ['', '']

  return (
    <div>
      {(sort || filters.length > 0 || hiddenColumns.length > 0) && (
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          {sort && (
            <span className={chip}>
              {t('table.sortChip', {
                column: nameOf(sort.columnId),
                direction: sort.direction === 'asc' ? up : down,
              })}
              <button
                type="button"
                aria-label={t('table.removeSort')}
                onClick={() => saveConfig(withSort(view.config, null))}
                className={chipX}
              >
                ×
              </button>
            </span>
          )}
          {filters.map((f) => {
            const label = filterLabel(
              f,
              f.columnId === TITLE_COLUMN_ID
                ? null
                : (columnById.get(f.columnId) ?? null),
              nameOf(f.columnId),
            )
            return (
              <span key={f.columnId} className={chip}>
                {label}
                <button
                  type="button"
                  aria-label={t('table.removeFilter', { name: label })}
                  onClick={() =>
                    saveConfig(withFilter(view.config, f.columnId, null))
                  }
                  className={chipX}
                >
                  ×
                </button>
              </span>
            )
          })}
          {hiddenColumns.length > 0 && (
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={(e) =>
                toggleMenu({ kind: 'hidden', anchor: e.currentTarget })
              }
              className={`${chip} pe-3 text-muted hover:text-ink`}
            >
              ◌ {t('table.hiddenCount', { count: hiddenColumns.length })}
            </button>
          )}
          {(sort || filters.length > 0) && (
            <button
              type="button"
              onClick={() => saveConfig(withoutQuery(view.config))}
              className="min-h-8 px-2 text-[12.5px] text-accent hover:underline"
            >
              {t('table.clearAll')}
            </button>
          )}
          {filters.length > 0 && (
            <span className="text-[12.5px] text-muted" aria-live="polite">
              {t('table.shown', { count: rows.length, total: all.length })}
            </span>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-[10px] border border-line">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th
                  scope="col"
                  aria-sort={
                    sort?.columnId === TITLE_COLUMN_ID
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className={`${head} sticky start-0 z-[1] min-w-52 bg-bg phone:min-w-40`}
                >
                  {headerButton(TITLE_COLUMN_ID, null)}
                </th>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      sort?.columnId === column.id
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className={`${head} min-w-32`}
                  >
                    {headerButton(column.id, column)}
                  </th>
                ))}
                <th scope="col" className={`${head} w-full`}>
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={(e) =>
                      toggleMenu({
                        kind: 'add',
                        more: false,
                        anchor: e.currentTarget,
                      })
                    }
                    className="min-h-8 rounded-md px-2 text-muted hover:bg-hover hover:text-ink"
                  >
                    {t('table.addColumn')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, shown).map((row) => (
                <tr key={row.page.id}>
                  <th
                    scope="row"
                    className={`${cell} sticky start-0 bg-bg text-start font-medium`}
                  >
                    {editing?.rowId === row.page.id &&
                    editing.columnId === TITLE_COLUMN_ID ? (
                      <InlineEditor
                        column={null}
                        label={titleName}
                        initial={row.page.title}
                        onCancel={() => setEditing(null)}
                        onSave={(typed) => {
                          setEditing(null)
                          void write(row.page.id, TITLE_COLUMN_ID, typed.trim())
                        }}
                      />
                    ) : (
                      <span className="flex items-start gap-1.5">
                        <button
                          type="button"
                          aria-label={`${t('table.editCell', {
                            column: titleName,
                            row: rowTitle(row),
                          })}`}
                          onClick={() =>
                            setEditing({
                              rowId: row.page.id,
                              columnId: TITLE_COLUMN_ID,
                            })
                          }
                          className={`${cellButton} ${row.page.title ? '' : 'text-muted'}`}
                        >
                          {rowTitle(row)}
                        </button>
                        <button
                          type="button"
                          aria-label={t('table.openRowLabel', {
                            name: rowTitle(row),
                          })}
                          onClick={() => onOpenPage(row.page.id)}
                          className="-my-0.5 min-h-7 shrink-0 rounded-md border border-line px-1.5 text-[11.5px] font-normal whitespace-nowrap text-muted hover:border-accent hover:text-accent"
                        >
                          {t('table.openRow')}
                        </button>
                      </span>
                    )}
                  </th>
                  {columns.map((column) => (
                    <td key={column.id} className={cell}>
                      {renderCell(row, column)}
                    </td>
                  ))}
                  <td className={cell} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted">
            {all.length > 0 ? t('table.noMatch') : t('database.empty')}
          </p>
        )}
        <NewRowTip tracker={tracker}>
          <button
            type="button"
            onClick={() => void newRow()}
            className="min-h-10 w-full border-t border-line px-3 text-start text-[13px] text-muted hover:bg-hover hover:text-ink"
          >
            {tracker ? t('table.newLesson') : t('table.newRow')}
          </button>
        </NewRowTip>
      </div>
      {tracker && (
        <>
          <HelpLine id="tracker.table" />
          <HelpLine id="tracker.levels" className="mt-1 text-xs text-muted" />
        </>
      )}
      {rows.length > shown && (
        <button
          type="button"
          onClick={() => setShown(shown + PAGE_SIZE)}
          className="mt-3 min-h-10 w-full rounded-lg border border-line text-sm text-muted hover:border-accent hover:text-accent"
        >
          {t('search.more')}
        </button>
      )}

      {menu?.kind === 'column' && menuColumn !== undefined && menuColumnId && (
        <ColumnMenu
          key={menuColumnId}
          anchor={menu.anchor}
          column={menuColumn}
          name={nameOf(menuColumnId)}
          sort={sort?.columnId === menuColumnId ? sort : undefined}
          filter={filters.find((f) => f.columnId === menuColumnId)}
          onSort={(next) => saveConfig(withSort(view.config, next))}
          onFilter={(next) =>
            saveConfig(withFilter(view.config, menuColumnId, next))
          }
          onHide={() => saveConfig(withHidden(view.config, menuColumnId, true))}
          onEdit={() =>
            setDialog(
              menuColumn
                ? { kind: 'edit', column: menuColumn }
                : { kind: 'title' },
            )
          }
          onClose={() => setMenu(null)}
          countWith={(next) => {
            const others = filters.filter((f) => f.columnId !== menuColumnId)
            const tried = {
              ...query,
              filters: next ? [...others, next] : others,
            }
            const count = queryRows(all, allColumns, tried).length
            return { count, total: all.length }
          }}
        />
      )}
      {menu?.kind === 'add' && (
        <Popover
          anchor={menu.anchor}
          label={t('column.type')}
          onClose={() => setMenu(null)}
        >
          <PopHeading>{t('column.type')}</PopHeading>
          {BASIC_TYPES.map((type) => (
            <PopItem
              key={type}
              {...typeLabel(type)}
              onClick={() => {
                setMenu(null)
                setDialog({ kind: 'new', type })
              }}
            />
          ))}
          <PopSeparator />
          {menu.more ? (
            <>
              <PopHeading>{t('column.moreTypes')}</PopHeading>
              {MORE_TYPES.map((type) => (
                <PopItem
                  key={type}
                  {...typeLabel(type)}
                  onClick={() => {
                    setMenu(null)
                    setDialog({ kind: 'new', type })
                  }}
                />
              ))}
            </>
          ) : (
            <PopItem
              icon="›"
              label={t('column.moreTypes')}
              hint={t('column.moreTypesHint')}
              onClick={() => setMenu({ ...menu, more: true })}
            />
          )}
        </Popover>
      )}
      {menu?.kind === 'hidden' && (
        <Popover
          anchor={menu.anchor}
          label={t('table.hiddenCount', { count: hiddenColumns.length })}
          onClose={() => setMenu(null)}
        >
          {hiddenColumns.map((column) => (
            <PopItem
              key={column.id}
              icon={columnIcon(column)}
              label={t('table.showColumn', { name: column.name })}
              onClick={() => {
                if (hiddenColumns.length === 1) setMenu(null)
                saveConfig(withHidden(view.config, column.id, false))
              }}
            />
          ))}
        </Popover>
      )}
      {menu?.kind === 'pick' &&
        pickRow?.tracker &&
        pickColumn?.type === 'trackerStatus' && (
          <StatusPicker
            key={`${menu.rowId}:${menu.columnId}`}
            row={pickRow.tracker}
            anchor={menu.anchor}
            onSet={(status) =>
              void setLessonStatus(db, menu.rowId, status).catch((e) =>
                ui.toast(t('table.badValue', { detail: String(e.message) })),
              )
            }
            onClose={() => setMenu(null)}
          />
        )}
      {menu?.kind === 'pick' &&
        pickRow &&
        pickColumn &&
        pickColumn.type !== 'trackerStatus' && (
          <OptionPicker
            key={`${menu.rowId}:${menu.columnId}`}
            db={db}
            data={data}
            column={pickColumn}
            row={pickRow}
            anchor={menu.anchor}
            onSet={async (value) => {
              await write(menu.rowId, menu.columnId, value)
            }}
            onClose={() => setMenu(null)}
          />
        )}
      {dialog && (
        <ColumnDialog
          db={db}
          data={data}
          database={database}
          target={dialog}
          now={now}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

/** A column header with the hover tip of a Study tracker column. */
function HeaderTip({
  column,
  tracker,
  children,
}: {
  column: DbColumn | null
  tracker: boolean
  children: ReactNode
}) {
  const id = tracker ? headerTip(column) : undefined
  return id ? <Tip id={id}>{children}</Tip> : <>{children}</>
}

/** The "+ New lesson" button with its tip (Study tracker only). */
function NewRowTip({
  tracker,
  children,
}: {
  tracker: boolean
  children: ReactNode
}) {
  return tracker ? (
    <Tip id="tracker.newLesson" className="block">
      {children}
    </Tip>
  ) : (
    <>{children}</>
  )
}
