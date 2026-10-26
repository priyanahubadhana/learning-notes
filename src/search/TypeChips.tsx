import { currentLocale, t } from '../i18n/t'
import { RESULT_TYPES, type SearchQuery } from './searchQuery'

type TypeValue = SearchQuery['type']

/** All · Pages · Notes · Cards, optionally with a count on each. */
export function TypeChips({
  value,
  onChange,
  counts,
  className = '',
}: {
  value: TypeValue
  onChange: (value: TypeValue) => void
  counts?: Record<TypeValue, number>
  className?: string
}) {
  const values: TypeValue[] = ['all', ...RESULT_TYPES]
  return (
    <div
      role="group"
      aria-label={t('search.show')}
      className={`flex flex-wrap gap-1.5 ${className}`}
    >
      {values.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`min-h-7 rounded-full border px-2.5 text-[12.5px] whitespace-nowrap ${
            value === v
              ? 'border-ink bg-ink text-bg'
              : 'border-line text-muted hover:text-ink'
          }`}
        >
          {t(v === 'all' ? 'search.type.all' : `search.type.${v}`)}
          {counts && (
            <span className="ms-1 tabular-nums opacity-80">
              {new Intl.NumberFormat(currentLocale()).format(counts[v])}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
