import { t } from '../../i18n/t'
import { settingsRegistry } from '../builtinSettings'
import type { VirtualRow } from './virtualRows'
import type { SearchHit } from './settingsSearch'
import { tv } from './tv'

/** SET-B05: matching rows from every section, each with its section name. */
export function SearchResults({
  hits,
  virtuals = [],
  sectionName = (id) => id,
  query,
  onOpen,
}: {
  hits: SearchHit[]
  /** Rows only the new screen has (page tabs, tours...). */
  virtuals?: VirtualRow[]
  sectionName?(sectionId: string): string
  query: string
  onOpen(settingId: string, sectionId: string): void
}) {
  const total = hits.length + virtuals.length
  if (total === 0)
    return (
      <div data-search-empty role="status" className="sv3-search-empty">
        <p className="sv3-row-name">{tv('sv3.searchNone', { query })}</p>
        <p className="sv3-line-help">{tv('sv3.searchTip')}</p>
      </div>
    )
  return (
    <>
      <p role="status" className="sr-only">
        {tv('sv3.searchFound', { count: total })}
      </p>
      <ul className="sv3-hits">
        {hits.map(({ definition: d }) => {
          const cat = settingsRegistry
            .categories()
            .find((c) => c.id === d.category)
          return (
            <li key={d.id}>
              <button
                type="button"
                data-hit={d.id}
                className="sv3-hit"
                onClick={() => onOpen(d.id, d.category)}
              >
                <span className="sv3-row-name">{t(d.labelKey)}</span>
                <span className="sv3-hit-section">
                  {cat ? t(cat.labelKey) : d.category}
                </span>
                <span className="sv3-line-help">{t(d.descriptionKey)}</span>
              </button>
            </li>
          )
        })}
        {virtuals.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              data-hit={v.id}
              className="sv3-hit"
              onClick={() => onOpen(v.id, v.section)}
            >
              <span className="sv3-row-name">{v.name}</span>
              <span className="sv3-hit-section">{sectionName(v.section)}</span>
              <span className="sv3-line-help">{v.help}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
