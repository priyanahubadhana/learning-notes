import type { MouseEvent } from 'react'
import { t } from '../i18n/t'
import { CardStatusLabel } from '../recall/CardStatusLabel'
import { highlightParts, snippet } from './highlight'
import type { HitDetails, SearchHit } from './searchQuery'
import { TYPE_ICON } from './useSearch'

/** Drawing one result (shared by the search popup and the Search screen). */

/** Text with the searched words marked. */
export function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((part, i) =>
        part.match ? (
          <mark key={i} className="rounded-[3px] bg-accent/15 text-inherit">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  )
}

/** Tags shown on a result row. */
const ROW_TAGS = 2

/** "Notebook · Page", plus Journal / Template, and its first tags. */
function whereText(hit: SearchHit, details: HitDetails | undefined): string {
  const parts = [details?.notebookTitle || t('review.untitled')]
  if (hit.type !== 'page')
    parts.push(details?.pageTitle || t('review.untitled'))
  if (hit.place === 'journal') parts.push(t('search.place.journal'))
  if (hit.place === 'templates') parts.push(t('search.place.template'))
  const tags = details?.tagNames ?? []
  if (tags.length > 0) {
    parts.push(
      tags
        .slice(0, ROW_TAGS)
        .map((name) => `#${name}`)
        .join(' ') + (tags.length > ROW_TAGS ? ' …' : ''),
    )
  }
  return parts.join(' · ')
}

/**
 * One result: what it is, the matching text (searched words marked),
 * where it is, and a card's status. `compact` fits it on one line.
 */
export function ResultRow({
  id,
  hit,
  details,
  query,
  now,
  compact = false,
  selected = false,
  plain = false,
  onOpen,
}: {
  id?: string
  hit: SearchHit
  details: HitDetails | undefined
  query: string
  now: number
  compact?: boolean
  selected?: boolean
  /** A normal button (reachable with Tab), not an option of a listbox. */
  plain?: boolean
  onOpen: (hit: SearchHit) => void
}) {
  const main =
    hit.type === 'page'
      ? details?.pageTitle || t('review.untitled')
      : snippet(details?.text ?? '', query, compact ? 90 : 160)
  return (
    <button
      id={id}
      type="button"
      {...(!plain && {
        role: 'option',
        'aria-selected': selected,
        tabIndex: -1,
        // Keeps focus in the search box.
        onMouseDown: (e: MouseEvent) => e.preventDefault(),
      })}
      onClick={() => onOpen(hit)}
      className={`flex w-full gap-2.5 rounded-lg px-2.5 text-start hover:bg-hover ${
        compact ? 'min-h-9 items-center py-1' : 'min-h-11 items-start py-2'
      } ${selected ? 'bg-hover shadow-[inset_2px_0_0_var(--color-accent)]' : ''}`}
    >
      <span aria-hidden className="w-[18px] shrink-0 text-center text-muted">
        {TYPE_ICON[hit.type]}
      </span>
      <span
        className={`min-w-0 flex-1 ${compact ? 'flex items-center gap-3' : ''}`}
      >
        <span
          className={`block text-sm ${
            compact
              ? 'min-w-0 truncate'
              : 'line-clamp-2 [overflow-wrap:anywhere]'
          }`}
        >
          {hit.empty && !main ? (
            <span className="text-muted italic">{t('search.emptyCard')}</span>
          ) : (
            <Highlighted text={main} query={query} />
          )}
        </span>
        <span
          className={`block truncate text-xs text-muted ${compact ? 'ms-auto shrink-0 max-w-[45%]' : 'mt-0.5'}`}
        >
          {whereText(hit, details)}
          {hit.deleted && (
            <span className="text-danger"> · {t('search.inTrash')}</span>
          )}
        </span>
      </span>
      {!!hit.fails && (
        <span className="shrink-0 text-xs font-medium text-danger">
          {t('search.fails', { count: hit.fails })}
        </span>
      )}
      {hit.empty ? (
        <span className="shrink-0 text-xs text-muted">
          {t('search.emptyLabel')}
        </span>
      ) : (
        hit.status &&
        hit.due !== undefined && (
          <CardStatusLabel status={hit.status} due={hit.due} now={now} />
        )
      )}
    </button>
  )
}
