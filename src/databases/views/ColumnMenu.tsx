import { useState, type FormEvent } from 'react'
import type { DbColumn, JsonValue } from '../../core/types'
import { t } from '../../i18n/t'
import { choiceOptions, TITLE_COLUMN_ID } from '../columnTypes'
import type { FilterOp, RowFilter, RowSort } from '../databaseQuery'
import {
  filterChoices,
  numberForInput,
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
}) {
  const columnId = column?.id ?? TITLE_COLUMN_ID
  const choices = filterChoices(column)
  const [op, setOp] = useState<FilterOp>(filter?.op ?? choices[0].op)
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
  const apply = (e: FormEvent) => {
    e.preventDefault()
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
    if (input !== 'none' && blank) return
    onFilter({ columnId, op, ...(wanted !== null && { value: wanted }) })
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
              {opLabel(c.op)}
            </option>
          ))}
        </select>
        {(input === 'text' || input === 'number') && (
          <input
            aria-label={t('filter.value')}
            inputMode={input === 'number' ? 'decimal' : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
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
        <button
          type="submit"
          className="min-h-9 rounded-md bg-accent px-3 text-[13px] font-medium text-white hover:opacity-90"
        >
          {t('column.apply')}
        </button>
      </form>
      {filter && (
        <PopItem
          icon="×"
          label={t('column.clearFilter')}
          onClick={() => {
            onFilter(null)
            onClose()
          }}
        />
      )}
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
