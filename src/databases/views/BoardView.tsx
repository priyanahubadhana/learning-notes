import type { ReactNode } from 'react'
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  type RefObject,
} from 'react'
import { AppUiContext } from '../../app/appUi'
import type { DbColumn, JsonValue } from '../../core/types'
import { t } from '../../i18n/t'
import { createPage } from '../../pages/pageService'
import { useMinuteClock } from '../../recall/useMinuteClock'
import { tagColorStyle } from '../../tags/tagStyle'
import { HelpLine, Tip } from '../../help/Help'
import { rowCellText } from '../cellDisplay'
import { isLessonStatus } from '../trackerStats'
import { statusTip } from './trackerTips'
import { PinMark } from './TrackerCells'
import { TITLE_COLUMN_ID } from '../columnTypes'
import { queryRows, resolveRows, type ResolvedRow } from '../databaseQuery'
import { addRow, placeRow, setCell, updateView } from '../databaseService'
import {
  NO_VALUE,
  boardGroupColumn,
  cardColumns,
  cardPlace,
  dropNeighbour,
  groupKeyOf,
  groupRows,
  moveValue,
  groupableColumns,
  withCardColumn,
  withCardMoved,
  withGroupBy,
  type BoardGroup,
  type CardMove,
} from './boardGroups'
import { ColumnDialog, type ColumnTarget } from './ColumnDialog'
import { columnIcon } from './columnLook'
import { PopHeading, PopItem, PopSeparator, Popover } from './Popover'
import { CellPills, InlineEditor } from './TableCells'
import { knownQuery, readRowQuery } from './viewConfig'
import { useDatabaseData } from './useDatabaseData'
import type { ViewProps } from './viewTypes'

/** Cards drawn per group at first, and added per "Show more". */
const PAGE_SIZE = 50

/** Column types whose values show as pills on a card. */
const PILL_TYPES = new Set([
  'choice',
  'choices',
  'tag',
  'noteLink',
  'relation',
  'trackerStatus',
])

/** Mouse: pixels moved before a press becomes a drag. */
const MOUSE_SLOP = 5
/** Touch: hold this long (ms) to pick a card up; moving sooner scrolls. */
const TOUCH_HOLD = 350
const TOUCH_SLOP = 8
/** Near the board's left/right edge while dragging, it scrolls sideways. */
const EDGE = 48
const EDGE_SPEED = 12

type Menu =
  | { kind: 'group'; anchor: HTMLElement }
  | { kind: 'card'; anchor: HTMLElement }
  | { kind: 'move'; rowId: string; anchor: HTMLElement }

/** A press on a card that may become a drag. */
interface Press {
  rowId: string
  pointerType: string
  startX: number
  startY: number
  card: HTMLElement
  timer?: number
}

/** A card being dragged: where the pointer is and where it would land. */
interface Drag {
  rowId: string
  from: CardMove
  width: number
  height: number
  offsetX: number
  offsetY: number
  x: number
  y: number
  target: CardMove
}

/**
 * Board view: rows as cards in columns, one per option of a Choice column
 * (e.g. To do · Doing · Done). Drag a card (mouse, or hold it on a touch
 * screen) and the cards make room where it will land; its ⋯ button has
 * Move to (keyboard). The grouping column and the values cards show are
 * saved in the view.
 */
export function BoardView({ db, database, view, onOpenPage }: ViewProps) {
  const ui = useContext(AppUiContext)
  const now = useMinuteClock()
  const data = useDatabaseData(db, database, now)
  const [shown, setShown] = useState<Record<string, number>>({})
  const [menu, setMenu] = useState<Menu | null>(null)
  const [dialog, setDialog] = useState<ColumnTarget | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  // A dropped card shows in its new place until the saved data catches up
  // (any newer data replaces it).
  const [landing, setLanding] = useState<{
    move: CardMove
    data: typeof data
  } | null>(null)
  const [boardEl, setBoardEl] = useState<HTMLDivElement | null>(null)
  const press = useRef<Press | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const scroll = useRef<{ dir: number; timer: number } | null>(null)
  const suppressClick = useRef(false)
  // Removes the document listeners of the current press or drag.
  const listeners = useRef<(() => void) | null>(null)

  const columns = data?.databases.get(database.id)?.columns
  const { rows, sorted } = useMemo(() => {
    if (!data || !columns) return { rows: [], sorted: false }
    const ids = new Set([TITLE_COLUMN_ID, ...columns.map((c) => c.id)])
    const query = knownQuery(readRowQuery(view.config), ids)
    return {
      rows: queryRows(resolveRows(data, now), columns, query),
      sorted: (query.sorts?.length ?? 0) > 0,
    }
  }, [data, columns, now, view.config])
  const groupColumn = columns && boardGroupColumn(view.config, columns)
  const groups = useMemo(
    () => (groupColumn ? groupRows(rows, groupColumn) : []),
    [rows, groupColumn],
  )

  // A blocking touchmove listener on the board, there from the start of a
  // touch: without it the browser hands the finger to scrolling and the
  // page never hears the moves. It stops the scroll only while a card is held.
  useEffect(() => {
    if (!boardEl) return
    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current && e.cancelable) e.preventDefault()
    }
    boardEl.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => boardEl.removeEventListener('touchmove', onTouchMove)
  }, [boardEl])
  useEffect(() => {
    const refs = { press, scroll, listeners }
    return () => stopGesture(refs)
  }, [])
  const endPress = () => stopGesture({ press, scroll, listeners })

  if (!data || !columns) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }

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
  const fail = (e: unknown) =>
    ui.toast(t('table.badValue', { detail: String((e as Error).message) }))
  const write = async (rowId: string, columnId: string, value: JsonValue) => {
    try {
      await setCell(db, rowId, columnId, value)
    } catch (e) {
      fail(e)
    }
  }
  const rowTitle = (row: ResolvedRow) => row.page.title || t('review.untitled')
  const groupName = (group: BoardGroup) =>
    group.option?.name ?? t('board.noValue', { column: groupColumn!.name })

  // "Move to" (menu): writes the new group's value, if it changed.
  const moveTo = (rowId: string, key: string) => {
    const row = rows.find((r) => r.page.id === rowId)
    if (!row || !groupColumn || groupKeyOf(row, groupColumn) === key) return
    void write(rowId, groupColumn.id, moveValue(groupColumn, key, row))
  }
  const newCard = async (key: string) => {
    if (!groupColumn) return
    const page =
      tracker && database.notebookId
        ? await createPage(db, database.notebookId, null, '')
        : await addRow(db, database.id)
    await write(page.id, groupColumn.id, moveValue(groupColumn, key))
    setEditing(page.id)
  }

  // ------------------------------------------------------------ dragging

  /** The group and index under the pointer (null: not over a column). */
  function targetAt(x: number, y: number, rowId: string): CardMove | null {
    const column = document
      .elementsFromPoint(x, y)
      .map((el) => el.closest<HTMLElement>('[data-board-group]'))
      .find((el) => el !== null)
    if (!column) return null
    const cards = [
      ...column.querySelectorAll<HTMLElement>('[data-board-card]'),
    ].filter((el) => el.dataset.boardCard !== rowId)
    const index = cards.filter((el) => {
      const box = el.getBoundingClientRect()
      return box.top + box.height / 2 < y
    }).length
    return { rowId, key: column.dataset.boardGroup!, index }
  }

  function setDragState(next: Drag | null) {
    dragRef.current = next
    setDrag(next)
  }

  function startDrag(p: Press, x: number, y: number) {
    const from = cardPlace(groups, p.rowId)
    if (!from) return
    const box = p.card.getBoundingClientRect()
    setMenu(null)
    setDragState({
      rowId: p.rowId,
      from,
      width: box.width,
      height: box.height,
      offsetX: p.startX - box.left,
      offsetY: p.startY - box.top,
      x,
      y,
      target: from,
    })
  }

  function autoScroll(x: number) {
    const el = boardEl
    if (!el) return
    const box = el.getBoundingClientRect()
    const dir = x < box.left + EDGE ? -1 : x > box.right - EDGE ? 1 : 0
    if ((scroll.current?.dir ?? 0) === dir) return
    if (scroll.current) window.clearInterval(scroll.current.timer)
    scroll.current = null
    if (dir === 0) return
    const timer = window.setInterval(() => {
      el.scrollLeft += dir * EDGE_SPEED
      const d = dragRef.current
      const target = d && targetAt(d.x, d.y, d.rowId)
      if (d && target) setDragState({ ...d, target })
    }, 16)
    scroll.current = { dir, timer }
  }

  function drop(d: Drag) {
    const { target, from } = d
    if (target.key === from.key && target.index === from.index) return
    const changes: Record<string, JsonValue> =
      target.key === from.key
        ? {}
        : {
            [groupColumn!.id]: moveValue(
              groupColumn!,
              target.key,
              rows.find((r) => r.page.id === d.rowId),
            ),
          }
    // A sorted view places cards by its sort, so only the group changes.
    const place = sorted ? null : dropNeighbour(groups, target)
    if (Object.keys(changes).length === 0 && !place) return
    setLanding({ move: target, data })
    placeRow(db, d.rowId, changes, place).catch((e) => {
      setLanding(null)
      fail(e)
    })
  }

  /**
   * A press on a card: mouse and pen pick it up after a small move, touch
   * after a hold (moving sooner is a scroll). Returns the handlers for the
   * pointer's moves, release and cancel.
   */
  function beginPress(
    rowId: string,
    pointerType: string,
    x: number,
    y: number,
    card: HTMLElement,
  ) {
    endPress()
    const p: Press = { rowId, pointerType, startX: x, startY: y, card }
    press.current = p
    if (pointerType === 'touch') {
      p.timer = window.setTimeout(() => {
        if (press.current === p) startDrag(p, x, y)
      }, TOUCH_HOLD)
    }
    /** Returns true while a card is being dragged (the move is used). */
    const move = (mx: number, my: number): boolean => {
      const d = dragRef.current
      if (!d) {
        const moved = Math.hypot(mx - x, my - y)
        if (pointerType !== 'touch') {
          if (moved > MOUSE_SLOP) startDrag(p, mx, my)
        } else if (moved > TOUCH_SLOP) endPress() // a scroll, not a drag
        return dragRef.current !== null
      }
      const target = targetAt(mx, my, d.rowId) ?? d.target
      setDragState({ ...d, x: mx, y: my, target })
      autoScroll(mx)
      return true
    }
    const up = () => {
      const d = dragRef.current
      endPress()
      if (!d) return
      // The release must not also "click" the card open.
      suppressClick.current = true
      window.setTimeout(() => (suppressClick.current = false), 400)
      setDragState(null)
      drop(d)
    }
    const cancel = () => {
      endPress()
      setDragState(null)
    }
    return { move, up, cancel }
  }

  function canPress(target: EventTarget, rowId: string): boolean {
    if (editing === rowId || dragRef.current) return false
    return !(target as HTMLElement).closest('[data-no-drag]')
  }

  // Mouse and pen: pointer events.
  function onCardPointerDown(e: ReactPointerEvent, rowId: string) {
    if (e.pointerType === 'touch' || e.button !== 0) return
    if (!canPress(e.target, rowId)) return
    const h = beginPress(
      rowId,
      e.pointerType,
      e.clientX,
      e.clientY,
      e.currentTarget as HTMLElement,
    )
    const move = (ev: PointerEvent) => void h.move(ev.clientX, ev.clientY)
    listen([
      ['pointermove', move],
      ['pointerup', h.up],
      ['pointercancel', h.cancel],
    ])
  }

  // Touch: touch events, which (unlike pointer events) keep coming when
  // the browser would start scrolling, so a held card can block the scroll.
  function onCardTouchStart(e: ReactTouchEvent, rowId: string) {
    if (e.touches.length !== 1 || !canPress(e.target, rowId)) return
    const touch = e.touches[0]
    const h = beginPress(
      rowId,
      'touch',
      touch.clientX,
      touch.clientY,
      e.currentTarget as HTMLElement,
    )
    const move = (ev: TouchEvent) => {
      const t = ev.touches[0]
      if (t && h.move(t.clientX, t.clientY) && ev.cancelable) {
        ev.preventDefault()
      }
    }
    listen([
      ['touchmove', move, { passive: false }],
      ['touchend', h.up],
      ['touchcancel', h.cancel],
    ])
  }

  /** Listens on the document until the press ends (see stopGesture). */
  function listen(
    entries: [string, (e: never) => void, AddEventListenerOptions?][],
  ) {
    const all = entries as [string, EventListener, AddEventListenerOptions?][]
    for (const [type, fn, options] of all) {
      document.addEventListener(type, fn, options)
    }
    listeners.current = () => {
      for (const [type, fn, options] of all) {
        document.removeEventListener(type, fn, options)
      }
    }
  }

  // ---------------------------------------------------------------- empty

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

  // ---------------------------------------------------------------- board

  const move = drag?.target ?? (landing?.data === data ? landing.move : null)
  const laidOut = move ? withCardMoved(groups, move) : groups
  // "No Status" shows only while it holds cards. Decided before the drag,
  // so columns never shift under the pointer while a card is moved.
  const hideEmpty = !groups.some((g) => g.key === NO_VALUE && g.rows.length > 0)
  const visible = laidOut.filter((g) => g.key !== NO_VALUE || !hideEmpty)
  const noOptions = laidOut.length === 1
  const dragged = drag && rows.find((r) => r.page.id === drag.rowId)
  // The dragged card stays in the page, invisible and out of the layout:
  // touch events keep going to the element a touch started on, so it must
  // not be removed while the finger is down.
  const lifted = dragged ?? null
  const moveRow =
    menu?.kind === 'move' ? rows.find((r) => r.page.id === menu.rowId) : null
  const toolButton =
    'inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] hover:bg-hover'
  const editOptions = () => setDialog({ kind: 'edit', column: groupColumn })
  // A Study tracker's Status has a fixed list of options.
  const fixedOptions = groupColumn.type === 'trackerStatus'

  const cardValue = (row: ResolvedRow, column: DbColumn) => {
    const value = row.values[column.id] ?? null
    const text = rowCellText(row, column)
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
  const cardValues = (row: ResolvedRow) => {
    const values = shownValues
      .map((c) => cardValue(row, c))
      .filter((v) => v !== null)
    return values.length > 0 ? (
      <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 px-1 text-xs">
        {values}
      </div>
    ) : null
  }

  const renderCard = (row: ResolvedRow, hidden: boolean) => (
    <li
      key={row.page.id}
      data-board-card={hidden ? undefined : row.page.id}
      aria-hidden={hidden || undefined}
      onPointerDown={(e) => onCardPointerDown(e, row.page.id)}
      onTouchStart={(e) => onCardTouchStart(e, row.page.id)}
      onContextMenu={(e) => {
        // A long press picks the card up, not the browser menu.
        if (press.current && press.current.pointerType !== 'mouse') {
          e.preventDefault()
        }
      }}
      style={
        hidden
          ? {
              position: 'absolute',
              insetInline: 0,
              top: 0,
              visibility: 'hidden',
              pointerEvents: 'none',
            }
          : undefined
      }
      className="cursor-grab rounded-[9px] border border-line bg-bg px-2.5 py-2 select-none [-webkit-touch-callout:none]"
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
            onClick={() => {
              if (!suppressClick.current) onOpenPage(row.page.id)
            }}
            className="min-h-8 min-w-0 flex-1 cursor-grab rounded-md px-1 text-start font-medium break-words hover:bg-hover"
          >
            {rowTitle(row)}
          </button>
        )}
        {row.tracker?.override && <PinMark />}
        <button
          type="button"
          data-no-drag
          aria-haspopup="dialog"
          aria-expanded={menu?.kind === 'move' && menu.rowId === row.page.id}
          aria-label={t('board.moveLabel', { row: rowTitle(row) })}
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
      {cardValues(row)}
    </li>
  )

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <Tip id="db.groupedBy" touchInfo={false}>
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
        </Tip>
        <Tip id="db.cardShows" touchInfo={false}>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={menu?.kind === 'card'}
            onClick={(e) =>
              toggleMenu({ kind: 'card', anchor: e.currentTarget })
            }
            className={toolButton}
          >
            {t('board.cardShows')}
            <span aria-hidden className="text-[10px] text-muted">
              ▾
            </span>
          </button>
        </Tip>
      </div>

      {/* `relative` keeps everything inside (incl. screen-reader text) in the scroll box. */}
      {fixedOptions && (
        <HelpLine id="tracker.board" className="mb-2.5 text-xs text-muted" />
      )}
      <div
        ref={setBoardEl}
        data-board-scroller
        className="relative flex items-start gap-3 overflow-x-auto overscroll-x-contain pb-2"
      >
        {visible.map((group) => {
          const limit = shown[group.key] ?? PAGE_SIZE
          const name = groupName(group)
          const gapAt =
            drag && drag.target.key === group.key ? drag.target.index : -1
          const cards = group.rows.slice(0, Math.max(limit, gapAt + 1))
          return (
            <section
              key={group.key}
              data-board-group={group.key}
              aria-label={t('board.group', {
                name,
                count: group.rows.length,
              })}
              className={`flex w-64 shrink-0 flex-col rounded-xl bg-soft p-2.5 transition-[background-color,box-shadow] phone:w-[78vw] ${
                drag?.target.key === group.key ? 'board-target' : ''
              }`}
            >
              <h3 className="mx-1 mb-2.5 flex items-center gap-2 text-[13px] font-semibold">
                {group.option ? (
                  <StatusTip column={groupColumn} group={group}>
                    <span
                      className={`tag-chip ${group.option.color ? 'tag-chip-colored' : ''}`}
                      style={tagColorStyle(group.option.color)}
                    >
                      {name}
                    </span>
                  </StatusTip>
                ) : (
                  <span className="text-muted">{name}</span>
                )}
                <span aria-hidden className="font-normal text-muted">
                  {group.rows.length}
                </span>
              </h3>
              <ul className="relative flex min-h-10 flex-col gap-2">
                {[
                  ...cards.map((row) =>
                    drag?.rowId === row.page.id ? (
                      // The gap where the dragged card will land.
                      <li
                        key="board-gap"
                        aria-hidden
                        data-board-gap
                        className="board-gap rounded-[9px]"
                        style={{ height: drag.height }}
                      />
                    ) : (
                      renderCard(row, false)
                    ),
                  ),
                  // In the same list, so React keeps (moves) its element.
                  lifted && drag?.from.key === group.key
                    ? renderCard(lifted, true)
                    : null,
                ]}
              </ul>
              {group.rows.length > cards.length && (
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
              <NewCardTip tracker={tracker}>
                <button
                  type="button"
                  onClick={() => void newCard(group.key)}
                  className="mt-2 min-h-8 rounded-md px-1 text-start text-[13px] text-muted hover:bg-hover hover:text-ink"
                >
                  {tracker ? t('table.newLesson') : t('table.newRow')}
                  <span className="sr-only">
                    {' '}
                    {t('board.newIn', { group: name })}
                  </span>
                </button>
              </NewCardTip>
            </section>
          )
        })}
        {/* Last column: add options to the grouping column. */}
        {!fixedOptions && (
          <div
            className={`flex shrink-0 flex-col items-start gap-2 rounded-xl border border-dashed border-line p-3 ${
              noOptions ? 'w-64 phone:w-[70vw]' : 'w-40'
            }`}
          >
            {noOptions && (
              <p className="text-[13px] text-muted">
                {t('board.noOptions', { column: groupColumn.name })}
              </p>
            )}
            <button
              type="button"
              onClick={editOptions}
              className={
                noOptions
                  ? 'min-h-9 rounded-lg bg-accent px-3 text-[13px] font-medium text-white hover:opacity-90'
                  : 'min-h-8 rounded-md px-1 text-[13px] text-muted hover:bg-hover hover:text-ink'
              }
            >
              {noOptions ? t('board.addOptions') : t('board.addOption')}
            </button>
          </div>
        )}
      </div>

      {/* The card under the finger / mouse while dragging. */}
      {drag && dragged && (
        <div
          aria-hidden
          data-board-ghost
          className="pointer-events-none fixed z-50 rotate-2 rounded-[9px] border border-line bg-bg px-2.5 py-2 shadow-[0_14px_32px_rgba(0,0,0,0.22)]"
          style={{
            left: drag.x - drag.offsetX,
            top: drag.y - drag.offsetY,
            width: drag.width,
          }}
        >
          <div className="flex min-h-8 items-center px-1 font-medium">
            {rowTitle(dragged)}
          </div>
          {cardValues(dragged)}
        </div>
      )}

      {menu?.kind === 'group' && (
        <Popover
          anchor={menu.anchor}
          label={t('board.groupBy')}
          onClose={() => setMenu(null)}
        >
          {!fixedOptions && (
            <>
              <PopItem
                icon="✎"
                label={t('board.editOptionsOf', { column: groupColumn.name })}
                onClick={() => {
                  setMenu(null)
                  editOptions()
                }}
              />
              <PopSeparator />
            </>
          )}
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
            icon="arrowUpRight"
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

/** Stops listening to the pointer and scrolling (the drag state stays). */
function stopGesture(refs: {
  press: RefObject<Press | null>
  scroll: RefObject<{ dir: number; timer: number } | null>
  listeners: RefObject<(() => void) | null>
}) {
  const p = refs.press.current
  if (p?.timer) window.clearTimeout(p.timer)
  refs.press.current = null
  if (refs.scroll.current) window.clearInterval(refs.scroll.current.timer)
  refs.scroll.current = null
  refs.listeners.current?.()
  refs.listeners.current = null
}

/** A status column's heading with the tip that explains the status. */
function StatusTip({
  column,
  group,
  children,
}: {
  column: DbColumn
  group: BoardGroup
  children: ReactNode
}) {
  return column.type === 'trackerStatus' && isLessonStatus(group.key) ? (
    <Tip id={statusTip(group.key)}>{children}</Tip>
  ) : (
    <>{children}</>
  )
}

/** The "+ New lesson" button of a board column, with its tip (Study tracker). */
function NewCardTip({
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
