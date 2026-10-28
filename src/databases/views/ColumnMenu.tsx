import { useState, type FormEvent } from 'react'
import type { DbColumn, JsonValue } from '../../core/types'
import { t } from '../../i18n/t'
import { starMax } from '../cellDisplay'
import { choiceOptions, TITLE_COLUMN_ID } from '../columnTypes'
import type { FilterOp, RowFilter, RowSort } from '../databaseQuery'
import {
  filterChoices,
  numberForInput,
  numberTyping,
  opLabel,
  sortLabels,
  typedNumber,
} from './columnFilters'
import { isAutoColumn } from './columnLook'
import { PopHeading, PopItem, PopSeparator, Popover } from './Popover'

const field =
  'min-h-9 w-full rounded-md border border-line bg-bg px-2 text-[13.5px] outline-none focus:border-accent'

/**
 * A column header's menu: sort, filter, hide and edit. `column` null is
 * the title column. Sort and hide close the menu; the filter is set with
 * Apply (or Enter), so it can be typed in peace.
 */
export function ColumnMenu({
  anchor,
  column,
  name,
  sort,
  filter,
  onSort,
  onFilter,
  onHide,
  onEdit,
  onClose,
  countWith,
}: {
  anchor: HTMLElement
  column: DbColumn | null
  name: string
  sort: RowSort | undefined
  filter: RowFilter | undefined
  onSort: (sort: RowSort | null) => void
  onFilter: (filter: RowFilter | null) => void
  onHide: () => void
  onEdit: () => void
  onClose: () => void
  /** Rows shown with this filter in place of the column's current one. */
  countWith: (filter: RowFilter | null) => { count: number; total: number }
}) {
  const columnId = column?.id ?? TITLE_COLUMN_ID
  const choices = filterChoices(column)
  const stars = column?.config.format === 'stars' && column.type === 'number'
  // Ratings start at "at least" (★★★ or more is the usual question).
  const [op, setOp] = useState<FilterOp>(
    filter?.op ?? (stars ? 'gte' : choices[0].op),
  )
  const input = choices.find((c) => c.op === op)?.input ?? 'none'
  const [value, setValue] = useState<JsonValue | undefined>(filter?.value)
  // Typed text and numbers are kept as typed until Apply.
  const [draft, setDraft] = useState(() =>
    typeof filter?.value === 'number'
      ? numberForInput(filter.value, column)
      : typeof filter?.value === 'string'
        ? filter.value
        : '',
  )
  const [up, down] = sortLabels(column)
  const auto = column !== null && isAutoColumn(column)

  const pickSort = (direction: 'asc' | 'desc') => {
    onSort(sort?.direction === direction ? null : { columnId, direction })
    onClose()
  }
  /** The filter as set so far; null while its value is still missing. */
  const draftFilter = (): RowFilter | null => {
    const wanted =
      input === 'number'
        ? typedNumber(draft, column)
        : input === 'text'
          ? draft.trim() || null
          : input === 'none'
            ? null
            : (value ?? null)
    const blank =
      wanted === null || (Array.isArray(wanted) && wanted.length === 0)
    if (input !== 'none' && blank) return null
    return { columnId, op, ...(wanted !== null && { value: wanted }) }
  }
  const ready = draftFilter()
  const matches = ready ? countWith(ready) : null
  const apply = (e: FormEvent) => {
    e.preventDefault()
    if (!ready) return
    onFilter(ready)
    onClose()
  }

  const picked = Array.isArray(value) ? value : []

  return (
    <Popover
      anchor={anchor}
      label={t('table.columnMenu', { name })}
      onClose={onClose}
    >
      <PopHeading>{t('column.sort')}</PopHeading>
      <PopItem
        icon="↑"
        label={up}
        on={sort?.direction === 'asc'}
        onClick={() => pickSort('asc')}
      />
      <PopItem
        icon="↓"
        label={down}
        on={sort?.direction === 'desc'}
        onClick={() => pickSort('desc')}
      />
      <PopSeparator />
      <PopHeading>{t('column.filter')}</PopHeading>
      <form onSubmit={apply} className="flex flex-col gap-1.5 px-2.5 pb-1">
        <p className="text-[12.5px] text-muted">
          {t('filter.where', { column: name })}
        </p>
        <select
          aria-label={t('column.filter')}
          value={op}
          onChange={(e) => {
            const next = e.target.value as FilterOp
            const nextInput = choices.find((c) => c.op === next)?.input
            if (nextInput !== input) {
              setValue(undefined)
              setDraft('')
            }
            setOp(next)
          }}
          className={field}
        >
          {choices.map((c) => (
            <option key={c.op} value={c.op}>
              {opLabel(c.op, column)}
            </option>
          ))}
        </select>
        {input === 'number' && stars && column && (
          <div className="flex items-center gap-2">
            <div role="group" aria-label={t('filter.value')} className="flex">
              {Array.from({ length: starMax(column) }, (_, i) => i + 1).map(
                (n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={t('table.stars', { count: n })}
                    aria-pressed={String(n) === draft}
                    onClick={() => setDraft(String(n))}
                    className={`min-h-9 min-w-7 text-[17px] leading-none ${
                      n <= Number(draft || 0)
                        ? 'text-amber-500'
                        : 'text-muted/35 hover:text-muted'
                    }`}
                  >
                    ★
                  </button>
                ),
              )}
            </div>
            {draft && (
              <span className="text-[12.5px] text-muted">
                {t('table.stars', { count: Number(draft) })}
              </span>
            )}
          </div>
        )}
        {(input === 'text' || (input === 'number' && !stars)) && (
          <input
            aria-label={t('filter.value')}
            inputMode={input === 'number' ? 'decimal' : undefined}
            value={draft}
            onChange={(e) =>
              setDraft(
                input === 'number'
                  ? numberTyping(e.target.value)
                  : e.target.value,
              )
            }
            className={field}
          />
        )}
        {input === 'date' && (
          <input
            type="date"
            aria-label={t('filter.value')}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => setValue(e.target.value)}
            className={field}
          />
        )}
        {input === 'options' && column && (
          <div className="flex max-h-48 flex-col overflow-y-auto">
            {choiceOptions(column).map((option) => (
              <label
                key={option.id}
                className="flex min-h-8 items-center gap-2 rounded-md px-1 hover:bg-hover"
              >
                <input
                  type="checkbox"
                  checked={picked.includes(option.id)}
                  onChange={(e) =>
                    setValue(
                      e.target.checked
                        ? [...picked, option.id]
                        : picked.filter((id) => id !== option.id),
                    )
                  }
                />
                {option.name}
              </label>
            ))}
          </div>
        )}
        {matches && (
          <p className="text-[12.5px] text-muted" aria-live="polite">
            {t('filter.matches', matches)}
          </p>
        )}
        <div className="flex gap-1.5">
          <button
            type="submit"
            disabled={!ready}
            className="min-h-9 flex-1 rounded-md bg-accent px-3 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {t('column.apply')}
          </button>
          <button
            type="button"
            disabled={!filter && !ready}
            onClick={() => {
              if (filter) onFilter(null)
              onClose()
            }}
            className="min-h-9 flex-1 rounded-md border border-line px-3 text-[13px] hover:bg-hover disabled:opacity-50"
          >
            {t('column.clearFilter')}
          </button>
        </div>
      </form>
      {(column !== null || !auto) && <PopSeparator />}
      {column !== null && (
        <PopItem
          icon="◌"
          label={t('column.hide')}
          onClick={() => {
            onHide()
            onClose()
          }}
        />
      )}
      {!auto && (
        <PopItem
          icon="✎"
          label={t('column.edit')}
          onClick={() => {
            onClose()
            onEdit()
          }}
        />
      )}
      {auto && (
        <>
          <PopSeparator />
          <p className="px-2.5 py-1 text-xs leading-relaxed text-muted">
            {t('column.autoHint')}
          </p>
        </>
      )}
    </Popover>
  )
}
