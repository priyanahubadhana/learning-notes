import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnchoredMenu } from '../../app/tools/AnchoredMenu'
import { useAnchoredMenu } from '../../app/tools/useAnchoredMenu'
import { ReorderList } from './drag/ReorderList'
import { SheetBase } from './SheetBase'
import { moveRow, previewChips, removeRow, restoreRow } from './arrangeLogic'
import { tp } from './tp'
import './ArrangeSheet.css'

export type ArrangeRow = {
  id: string
  label: string
  preview?: ReactNode
  removable?: boolean
  hint?: string
}

export type ArrangeSheetProps = {
  title: string
  help?: string
  rows: ArrangeRow[]
  preview?: (rows: ArrangeRow[]) => ReactNode
  /** Applied live; one history step per action. */
  onChange(rows: ArrangeRow[]): void
  onAdd?(): void
  addLabel?: string
  onReset?(): void
  onDone(): void
  /** Opens the row's edit form (the sheet steps aside, then returns). */
  onRowTap?(id: string): void
  /** Add is disabled with a reason when the list is this long. */
  max?: number
  /** Reset is disabled when already the default. */
  isDefault?: boolean
  busy?: boolean
  mode?: 'floating' | 'inline'
  anchor?: HTMLElement | null
  phone?: boolean
  /** Gallery: freeze one row in the lifted look. */
  frozenLifted?: string
}

const UNDO_MS = 6000
const COLLAPSE_MS = 160
const reduced = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

interface Undo {
  row: ArrangeRow
  index: number
}

function RowMenu({
  row,
  index,
  count,
  onMove,
  onRemove,
}: {
  row: ArrangeRow
  index: number
  count: number
  onMove(to: number): void
  onRemove(): void
}) {
  const menu = useAnchoredMenu()
  const pick = (fn: () => void) => {
    menu.close()
    menu.opener?.focus()
    fn()
  }
  return (
    <>
      <button
        type="button"
        className="arr-icon"
        {...menu.trigger}
        data-testid="row-menu"
        aria-label={tp('parts.arrange.rowMenu', { name: row.label })}
        onClick={menu.toggle}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          {[3, 8, 13].map((x) => (
            <circle key={x} cx={x} cy="8" r="1.5" fill="currentColor" />
          ))}
        </svg>
      </button>
      <AnchoredMenu
        menu={menu}
        label={tp('parts.arrange.rowMenu', { name: row.label })}
        width={200}
      >
        <div className="arr-menu">
          <button
            type="button"
            role="menuitem"
            data-testid="menu-start"
            disabled={index === 0}
            onClick={() => pick(() => onMove(0))}
          >
            {tp('parts.arrange.toStart')}
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="menu-end"
            disabled={index === count - 1}
            onClick={() => pick(() => onMove(count - 1))}
          >
            {tp('parts.arrange.toEnd')}
          </button>
          {row.removable !== false ? (
            <button
              type="button"
              role="menuitem"
              data-testid="menu-remove"
              className="arr-danger"
              onClick={() => pick(onRemove)}
            >
              {tp('parts.arrange.remove')}
            </button>
          ) : null}
        </div>
      </AnchoredMenu>
    </>
  )
}

/** SP-07: the approved "Organise" sheet. Reorder with drag, ▲▼ or the "…" menu; remove with Undo. */
export function ArrangeSheet(props: ArrangeSheetProps) {
  const { rows, onChange, mode = 'floating', max } = props
  const sheetId = useId()
  const [removing, setRemoving] = useState<string | null>(null)
  const [undo, setUndo] = useState<Undo | null>(null)
  const [live, setLive] = useState('')
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach(clearTimeout)
      if (undoTimer.current) clearTimeout(undoTimer.current)
    }
  }, [])

  const move = (id: string, to: number) => onChange(moveRow(rows, id, to))

  const remove = (id: string) => {
    const doIt = () => {
      const r = removeRow(rows, id)
      setRemoving(null)
      if (!r.removed) return
      onChange(r.rows)
      setUndo({ row: r.removed, index: r.index })
      setLive(tp('parts.arrange.removedLive', { name: r.removed.label }))
      if (undoTimer.current) clearTimeout(undoTimer.current)
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS)
    }
    if (reduced()) return doIt()
    setRemoving(id)
    timers.current.push(setTimeout(doIt, COLLAPSE_MS))
  }

  const doUndo = () => {
    if (!undo) return
    onChange(restoreRow(rows, undo.row, undo.index))
    setLive(tp('parts.arrange.restored', { name: undo.row.label }))
    setUndo(null)
    if (undoTimer.current) clearTimeout(undoTimer.current)
  }

  const atMax = max !== undefined && rows.length >= max
  const chips = previewChips(rows.map((r) => r.label))

  const footer = (
    <>
      {props.onReset ? (
        <button
          type="button"
          className="arr-btn"
          data-testid="arrange-reset"
          disabled={props.isDefault || props.busy}
          onClick={props.onReset}
        >
          {tp('parts.arrange.reset')}
        </button>
      ) : null}
      <span className="arr-spacer" />
      {props.onAdd ? (
        <button
          type="button"
          className="arr-btn"
          data-testid="arrange-add"
          disabled={atMax || props.busy}
          onClick={props.onAdd}
        >
          <span aria-hidden="true">+ </span>
          {props.addLabel ?? tp('parts.arrange.add')}
        </button>
      ) : null}
      <button
        type="button"
        className="arr-btn arr-primary"
        data-testid="arrange-done"
        data-autofocus=""
        onClick={props.onDone}
      >
        {tp('parts.arrange.done')}
      </button>
    </>
  )

  return (
    <SheetBase
      id={sheetId}
      title={props.title}
      mode={mode}
      anchor={props.anchor}
      phone={props.phone}
      onClose={props.onDone}
      footer={footer}
      data-testid="arrange-sheet"
    >
      <p className="arr-help">{props.help ?? tp('parts.arrange.help')}</p>
      <div className="arr-well" data-testid="arrange-preview">
        <span className="arr-well-label">{tp('parts.arrange.preview')}</span>
        {props.preview ? (
          props.preview(rows)
        ) : (
          <span className="arr-chips">
            {chips.shown.map((l, i) => (
              <span key={i} className="arr-chip">
                {l}
              </span>
            ))}
            {chips.more ? (
              <span className="arr-chip arr-chip-more">
                {tp('parts.arrange.more', { n: chips.more })}
              </span>
            ) : null}
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="arr-empty" data-testid="arrange-empty">
          <p>{tp('parts.arrange.emptyTitle')}</p>
        </div>
      ) : (
        <ReorderList
          items={rows}
          getId={(r) => r.id}
          label={(r) => r.label}
          axis="y"
          handle="grip"
          showMoveButtons
          disabled={props.busy}
          onMove={(id, to) => move(id, to)}
          aria-label={tp('parts.arrange.listLabel')}
          testId="arrange-list"
          className="arr-list"
          itemClass={(r) =>
            r.id === removing
              ? 'arr-collapsing'
              : r.id === props.frozenLifted
                ? 'arr-frozen'
                : undefined
          }
          renderItem={(row, ctx) => (
            <div className="arr-row" data-testid="arrange-row">
              {ctx.grip}
              <span className="arr-tile" aria-hidden="true">
                {row.preview}
              </span>
              {props.onRowTap ? (
                <button
                  type="button"
                  className="arr-name arr-name-btn"
                  onClick={() => props.onRowTap?.(row.id)}
                >
                  <span>{row.label}</span>
                  {row.hint ? <small>{row.hint}</small> : null}
                </button>
              ) : (
                <span className="arr-name">
                  <span>{row.label}</span>
                  {row.hint ? <small>{row.hint}</small> : null}
                </span>
              )}
              {ctx.moveButtons}
              <RowMenu
                row={row}
                index={ctx.index}
                count={ctx.count}
                onMove={(to) => move(row.id, to)}
                onRemove={() => remove(row.id)}
              />
            </div>
          )}
        />
      )}
      {atMax ? (
        <p className="arr-reason" data-testid="arrange-max">
          {tp('parts.arrange.atMax', { max: max ?? 0 })}
        </p>
      ) : null}
      {undo ? (
        <div className="arr-undo" role="status" data-testid="arrange-undo">
          <span>{tp('parts.arrange.removed', { name: undo.row.label })}</span>
          <button
            type="button"
            className="arr-undo-btn"
            data-testid="arrange-undo-btn"
            onClick={doUndo}
          >
            {tp('parts.arrange.undo')}
          </button>
        </div>
      ) : null}
      <div className="rord-live" role="status" aria-live="polite">
        {live}
      </div>
    </SheetBase>
  )
}
