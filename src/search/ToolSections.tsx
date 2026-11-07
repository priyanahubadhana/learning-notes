import { useMemo } from 'react'
import type { Row } from '../app/tools/controlRows'
import { Icon } from '../app/tools/icons'
import { RECOMMENDED, recentTools } from './recentTools'
import { t } from '../i18n/t'

/**
 * The fixed sections above the tool search (R7-13): Recent (tools used from
 * the search, newest first), Favourites (the tools pinned to the bar) and
 * Recommended. One tap runs the tool. They show when the search is open and
 * nothing is typed; results come under them.
 */

export function ToolSections({
  rows,
  pinned,
  onRun,
}: {
  rows: readonly Row[]
  /** Tool ids pinned to the bar. */
  pinned: readonly string[]
  onRun: (row: Row) => void
}) {
  const recent = recentTools.useValue()
  const byKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows])
  const pick = (keys: readonly string[]) =>
    keys.map((k) => byKey.get(k)).filter((r): r is Row => !!r && !r.coming)
  const sections = [
    { id: 'recent', label: t('search.sec.recent'), rows: pick(recent) },
    {
      id: 'favourites',
      label: t('search.sec.favourites'),
      rows: pick(pinned.map((id) => `tool:${id}`)).slice(0, 8),
    },
    {
      id: 'recommended',
      label: t('search.sec.recommended'),
      rows: pick(RECOMMENDED),
    },
  ].filter((s) => s.rows.length > 0)
  if (sections.length === 0) return null
  return (
    <div
      data-tool-sections
      className="max-h-[40%] shrink-0 overflow-y-auto border-b border-line px-3.5 py-2"
    >
      {sections.map((s) => (
        <section key={s.id} data-tool-section={s.id} aria-label={s.label}>
          <h3 className="pt-1 pb-0.5 text-[11px] tracking-[0.06em] text-muted uppercase">
            {s.label}
          </h3>
          <div className="flex flex-wrap gap-1.5 pb-1">
            {s.rows.map((row) => (
              <button
                key={row.key}
                type="button"
                data-tool-chip={row.key}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onRun(row)}
                className="flex min-h-11 items-center gap-1.5 rounded-xl border border-line px-3 text-sm hover:bg-hover"
              >
                <Icon name={row.icon} size={16} />
                <span className="truncate">{row.label}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
