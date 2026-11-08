import type { DbColumn } from '../../core/types'
import { t } from '../../i18n/t'
import { groupByColumns } from './rowGroups'

/** "Group by" picker shared by Table and List (a native select works with every keyboard and screen reader). */
export function GroupSelect({
  columns,
  value,
  onChange,
}: {
  columns: readonly DbColumn[]
  value: string
  onChange: (columnId: string) => void
}) {
  const choices = groupByColumns(columns)
  if (choices.length === 0) return null
  return (
    <label className="mb-2.5 flex items-center gap-2 text-[12.5px] text-muted">
      {t('group.label')}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-8 rounded-md border border-line bg-bg px-2 text-ink"
      >
        <option value="">{t('group.none')}</option>
        {choices.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  )
}
