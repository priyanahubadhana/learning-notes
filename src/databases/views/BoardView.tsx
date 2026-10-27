import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useMemo, useState, type DragEvent } from 'react'
import { AppUiContext } from '../../app/appUi'
import type { DbColumn, JsonValue } from '../../core/types'
import { t } from '../../i18n/t'
import { createPage } from '../../pages/pageService'
import { useMinuteClock } from '../../recall/useMinuteClock'
import { tagColorStyle } from '../../tags/tagStyle'
import { cellText } from '../cellDisplay'
import { TITLE_COLUMN_ID } from '../columnTypes'
import {
  loadDatabaseData,
  queryRows,
  resolveRows,
  type ResolvedRow,
} from '../databaseQuery'
import { addRow, setCell, updateView } from '../databaseService'
import {
  NO_VALUE,
  boardGroupColumn,
  cardColumns,
  groupKeyOf,
  groupRows,
  groupValue,
  groupableColumns,
  withCardColumn,
  withGroupBy,
  type BoardGroup,
} from './boardGroups'
import { ColumnDialog, type ColumnTarget } from './ColumnDialog'
import { columnIcon } from './columnLook'
import { PopHeading, PopItem, PopSeparator, Popover } from './Popover'
import { CellPills, InlineEditor } from './TableCells'
import { knownQuery, readRowQuery } from './viewConfig'
import type { ViewProps } from './viewTypes'

/** Cards drawn per group at first, and added per "Show more". */
const PAGE_SIZE = 50

/** Column types whose values show as pills on a card. */
const PILL_TYPES = new Set(['choice', 'choices', 'tag', 'noteLink', 'relation'])

/** Drag data type, so drops of other things (files, text) are ignored. */
const DRAG_TYPE = 'application/x-learning-notes-row'

type Menu =
  | { kind: 'group'; anchor: HTMLElement }
  | { kind: 'card'; anchor: HTMLElement }
  | { kind: 'move'; rowId: string; anchor: HTMLElement }

/**
 * Board view: rows as cards in columns, one per option of a Choice column
 * (e.g. To do · Doing · Done). Drag a card to another column, or use its
 * "Move to…" button (touch and keyboard). The grouping column and the
 * values cards show are saved in the view.
 */
export function BoardView({ db, database, view, onOpenPage }: ViewProps) {
  const ui = useContext(AppUiContext)
  const data = useLiveQuery(
    () => loadDatabaseData(db, database.id),
    [db, database.id],
  )
  const now = useMinuteClock()
  const [shown, setShown] = useState<Record<string, number>>({})
  const [menu, setMenu] = useState<Menu | null>(null)
  const [dialog, setDialog] = useState<ColumnTarget | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  const columns = data?.databases.get(database.id)?.columns
  const rows = useMemo(() => {
    if (!data || !columns) return []
    const ids = new Set([TITLE_COLUMN_ID, ...columns.map((c) => c.id)])
    const query = knownQuery(readRowQuery(view.config), ids)
    return queryRows(resolveRows(data, now), columns, query)
  }, [data, columns, now, view.config])
  if (!data || !columns) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }

  const groupColumn = boardGroupColumn(view.config, columns)
  const groups = groupColumn ? groupRows(rows, groupColumn) : []
  const shownValues = cardColumns(view.config, columns, groupColumn?.id)
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
    } catch (e) {
      ui.toast(t('table.badValue', { detail: String((e as Error).message) }))
    }
  }
  const rowTitle = (row: ResolvedRow) => row.page.title || t('review.untitled')
  const groupName = (group: BoardGroup) =>
    group.option?.name ?? t('board.noValue', { column: groupColumn!.name })

  // Moves a card: writes the new group's value (nothing if it is already there).
  const moveTo = (rowId: string, key: string) => {
    const row = rows.find((r) => r.page.id === rowId)
    if (!row || !groupColumn || groupKeyOf(row, groupColumn) === key) return
    void write(rowId, groupColumn.id, groupValue(key))
  }
  const newCard = async (key: string) => {
    if (!groupColumn) return
    const page =
      tracker && database.notebookId
        ? await createPage(db, database.notebookId, null, '')
        : await addRow(db, database.id)
    await write(page.id, groupColumn.id, groupValue(key))
    setEditing(page.id)
  }

  if (!groupColumn) {
    return (
      <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center">
        <p className="mx-auto mb-4 max-w-md text-sm text-muted">
          {t('board.noChoice')}
        </p>
        <button
          type="button"
          onClick={() => setDialog({ kind: 'new', type: 'choice' })}
          className="min-h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
        >
          {t('board.addChoice')}
        </button>
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

  // Drag and drop (mouse). Touch and keyboard use "Move to…".
  const onDragOver = (e: DragEvent, key: string) => {
    if (!dragging || !e.dataTransfer.types.includes(DRAG_TYPE)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (over !== key) setOver(key)
  }
  const onDrop = (e: DragEvent, key: string) => {
    const rowId = e.dataTransfer.getData(DRAG_TYPE)
    setOver(null)
    setDragging(null)
    if (!rowId) return
    e.preventDefault()
    moveTo(rowId, key)
  }

  const cardValue = (row: ResolvedRow, column: DbColumn) => {
    const value = row.values[column.id] ?? null
    const text = cellText(value, column)
    if (!text) return null
    if (PILL_TYPES.has(column.type)) {
      return <CellPills key={column.id} column={column} value={value} />
    }
    const plain = column.type === 'number' && column.config.format === 'stars'
    return (
      <span key={column.id} className="max-w-full truncate">
        {!plain && <span className="text-muted">{column.name} </span>}
        {text}
      </span>
    )
  }

  // "No Status" shows only while it holds cards (or a card is being dragged).
  const visible = groups.filter(
    (g) => g.key !== NO_VALUE || g.rows.length > 0 || dragging !== null,
  )
  const moveRow =
    menu?.kind === 'move' ? rows.find((r) => r.page.id === menu.rowId) : null
  const toolButton =
    'inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] hover:bg-hover'

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={menu?.kind === 'group'}
          onClick={(e) =>
            toggleMenu({ kind: 'group', anchor: e.currentTarget })
          }
          className={toolButton}
        >
          {t('board.groupedBy', { column: groupColumn.name })}
          <span aria-hidden className="text-[10px] text-muted">
            ▾
          </span>
        </button>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={menu?.kind === 'card'}
          onClick={(e) => toggleMenu({ kind: 'card', anchor: e.currentTarget })}
          className={toolButton}
        >
          {t('board.cardShows')}
          <span aria-hidden className="text-[10px] text-muted">
            ▾
          </span>
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {visible.map((group) => {
          const limit = shown[group.key] ?? PAGE_SIZE
          const name = groupName(group)
          return (
            <section
              key={group.key}
              aria-label={t('board.group', {
                name,
                count: group.rows.length,
              })}
              onDragOver={(e) => onDragOver(e, group.key)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setOver(null)
                }
              }}
              onDrop={(e) => onDrop(e, group.key)}
              className={`flex w-64 shrink-0 flex-col rounded-xl bg-soft p-2.5 phone:w-[78vw] ${
                over === group.key
                  ? 'shadow-[inset_0_0_0_2px_var(--color-accent)]'
                  : ''
              }`}
            >
              <h3 className="mx-1 mb-2.5 flex items-center gap-2 text-[13px] font-semibold">
                {group.option ? (
                  <span
                    className={`tag-chip ${group.option.color ? 'tag-chip-colored' : ''}`}
                    style={tagColorStyle(group.option.color)}
                  >
                    {name}
                  </span>
                ) : (
                  <span className="text-muted">{name}</span>
                )}
                <span aria-hidden className="font-normal text-muted">
                  {group.rows.length}
                </span>
              </h3>
              <ul className="flex min-h-10 flex-col gap-2">
                {group.rows.slice(0, limit).map((row) => {
                  const values = shownValues
                    .map((c) => cardValue(row, c))
                    .filter((v) => v !== null)
                  return (
                    <li
                      key={row.page.id}
                      draggable={editing !== row.page.id}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DRAG_TYPE, row.page.id)
                        e.dataTransfer.effectAllowed = 'move'
                        setDragging(row.page.id)
                      }}
                      onDragEnd={() => {
                        setDragging(null)
                        setOver(null)
                      }}
                      className={`rounded-[9px] border border-line bg-bg px-2.5 py-2 ${
                        dragging === row.page.id ? 'opacity-50' : ''
                      } cursor-grab`}
                    >
                      <div className="flex items-start gap-1">
                        {editing === row.page.id ? (
                          <InlineEditor
                            column={null}
                            label={t('board.titleLabel')}
                            initial={row.page.title}
                            onCancel={() => setEditing(null)}
                            onSave={(typed) => {
                              setEditing(null)
                              void write(row.page.id, TITLE_COLUMN_ID, typed)
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenPage(row.page.id)}
                            className="min-h-8 min-w-0 flex-1 rounded-md px-1 text-start font-medium break-words hover:bg-hover"
                          >
                            {rowTitle(row)}
                          </button>
                        )}
                        <button
                          type="button"
                          aria-haspopup="dialog"
                          aria-expanded={
                            menu?.kind === 'move' && menu.rowId === row.page.id
                          }
                          aria-label={t('board.moveLabel', {
                            row: rowTitle(row),
                          })}
                          onClick={(e) =>
                            toggleMenu({
                              kind: 'move',
                              rowId: row.page.id,
                              anchor: e.currentTarget,
                            })
                          }
                          className="min-h-8 min-w-8 shrink-0 rounded-md text-muted hover:bg-hover hover:text-ink"
                        >
                          ⋯
                        </button>
                      </div>
                      {values.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 px-1 text-xs">
                          {values}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              {group.rows.length > limit && (
                <button
                  type="button"
                  onClick={() =>
                    setShown({ ...shown, [group.key]: limit + PAGE_SIZE })
                  }
                  className="mt-2 min-h-8 rounded-md text-[13px] text-muted hover:bg-hover hover:text-ink"
                >
                  {t('board.showMore', {
                    count: Math.min(PAGE_SIZE, group.rows.length - limit),
                  })}
                </button>
              )}
              <button
                type="button"
                aria-label={t('board.newIn', { group: name })}
                onClick={() => void newCard(group.key)}
                className="mt-2 min-h-8 rounded-md px-1 text-start text-[13px] text-muted hover:bg-hover hover:text-ink"
              >
                {tracker ? t('table.newLesson') : t('table.newRow')}
              </button>
            </section>
          )
        })}
      </div>
      {groupColumn && groups.length === 1 && (
        <p className="mt-2 text-sm text-muted">
          {t('board.noOptions', { column: groupColumn.name })}{' '}
          <button
            type="button"
            onClick={() => setDialog({ kind: 'edit', column: groupColumn })}
            className="text-accent hover:underline"
          >
            {t('board.editOptions')}
          </button>
        </p>
      )}

      {menu?.kind === 'group' && (
        <Popover
          anchor={menu.anchor}
          label={t('board.groupBy')}
          onClose={() => setMenu(null)}
        >
          <PopHeading>{t('board.groupBy')}</PopHeading>
          {groupableColumns(columns).map((c) => (
            <PopItem
              key={c.id}
              icon={columnIcon(c)}
              label={c.name}
              on={c.id === groupColumn.id}
              onClick={() => {
                setMenu(null)
                saveConfig(withGroupBy(view.config, c.id))
              }}
            />
          ))}
          <PopSeparator />
          <PopItem
            icon="✎"
            label={t('board.editOptions')}
            onClick={() => {
              setMenu(null)
              setDialog({ kind: 'edit', column: groupColumn })
            }}
          />
          <PopItem
            icon="+"
            label={t('board.addChoice')}
            onClick={() => {
              setMenu(null)
              setDialog({ kind: 'new', type: 'choice' })
            }}
          />
        </Popover>
      )}
      {menu?.kind === 'card' && (
        <Popover
          anchor={menu.anchor}
          label={t('board.cardShows')}
          onClose={() => setMenu(null)}
        >
          <PopHeading>{t('board.cardShows')}</PopHeading>
          {columns
            .filter((c) => c.id !== groupColumn.id)
            .map((c) => {
              const on = shownValues.some((s) => s.id === c.id)
              return (
                <PopItem
                  key={c.id}
                  pressable
                  icon={columnIcon(c)}
                  label={c.name}
                  on={on}
                  onClick={() =>
                    saveConfig(
                      withCardColumn(
                        view.config,
                        columns,
                        groupColumn.id,
                        c.id,
                        !on,
                      ),
                    )
                  }
                />
              )
            })}
        </Popover>
      )}
      {menu?.kind === 'move' && moveRow && (
        <Popover
          anchor={menu.anchor}
          label={t('board.moveLabel', { row: rowTitle(moveRow) })}
          onClose={() => setMenu(null)}
        >
          <PopItem
            icon="↗"
            label={t('board.open')}
            onClick={() => {
              setMenu(null)
              onOpenPage(moveRow.page.id)
            }}
          />
          <PopItem
            icon="✎"
            label={t('board.rename')}
            onClick={() => {
              setMenu(null)
              setEditing(moveRow.page.id)
            }}
          />
          <PopSeparator />
          <PopHeading>{t('board.moveTo')}</PopHeading>
          {groups.map((g) => (
            <PopItem
              key={g.key}
              label={groupName(g)}
              on={g.key === groupKeyOf(moveRow, groupColumn)}
              onClick={() => {
                setMenu(null)
                moveTo(moveRow.page.id, g.key)
              }}
            />
          ))}
        </Popover>
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
