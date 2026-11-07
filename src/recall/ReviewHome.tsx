import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { runTask } from '../app/errors'
import { ConfirmDialog, EmptyState } from '../app/ui'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import type { Deck, SavedSearch } from '../core/types'
import { t } from '../i18n/t'
import { listSavedSearches } from '../search/savedSearchService'
import { DeckEditor } from './DeckEditor'
import { deckDraftFromSearch, decksFromSearches } from './deckFromSearch'
import { deleteDeck, listDecks } from './deckService'
import { listPaused, resumeItem } from './pauseService'
import { scopeCounts, type ReviewScope } from './reviewService'
import { useMinuteClock } from './useMinuteClock'

/**
 * The Review home (E1): "All cards" and your decks as tiles with three
 * numbers (New · Learning · Due) and Study, then saved searches that can
 * become decks, and the Paused list with Resume.
 */
export function ReviewHome({
  db,
  onReview,
}: {
  db: LearningNotesDB
  onReview: (scope: ReviewScope) => void
}) {
  const now = useMinuteClock()
  const decks = useLiveQuery(() => listDecks(db), [db], [] as Deck[])
  const searches = useLiveQuery(
    () => listSavedSearches(db),
    [db],
    [] as SavedSearch[],
  )
  const paused = useLiveQuery(() => listPaused(db), [db], [])
  const [editing, setEditing] = useState<{
    deck?: Deck
    initial?: Partial<Deck>
  } | null>(null)
  const [deleting, setDeleting] = useState<Deck | null>(null)
  const [offerDone, setOfferDone] = usePref(
    'decksFromSearches.done',
    (v): v is boolean => typeof v === 'boolean',
    false,
  )

  return (
    <section aria-label={t('decks.heading')} className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="me-auto text-[15px] font-semibold">
          {t('decks.heading')}
        </h2>
        <button
          type="button"
          data-new-deck
          onClick={() => setEditing({})}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
        >
          {t('decks.newDeck')}
        </button>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DeckTile
          db={db}
          now={now}
          name={t('decks.allCards')}
          scope={{ kind: 'all' }}
          onStudy={onReview}
        />
        {decks.map((deck) => (
          <DeckTile
            key={deck.id}
            db={db}
            now={now}
            name={deck.name}
            colour={deck.colour}
            scope={{ kind: 'deck', deckId: deck.id }}
            onStudy={onReview}
            onEdit={() => setEditing({ deck })}
            onDelete={() => setDeleting(deck)}
          />
        ))}
      </ul>
      {decks.length === 0 && (
        <EmptyState
          testId="decks-empty"
          className="mt-3"
          icon="🗂"
          text={t('decks.empty')}
          action={t('empty.decks.action')}
          onAction={() => setEditing({})}
        />
      )}

      {searches.length > 0 && (
        <div className="mt-6" data-saved-searches>
          <h3 className="mb-1 text-xs font-medium text-muted">
            {t('decks.fromSearches.heading')}
          </h3>
          {!offerDone && (
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-line p-3 text-sm">
              <span className="me-auto">{t('decks.fromSearches.ask')}</span>
              <button
                type="button"
                data-make-all-decks
                onClick={() =>
                  runTask(
                    decksFromSearches(db, searches).then(() =>
                      setOfferDone(true),
                    ),
                  )
                }
                className="min-h-11 rounded-lg bg-accent px-3 font-medium text-white"
              >
                {t('decks.fromSearches.yes')}
              </button>
              <button
                type="button"
                onClick={() => setOfferDone(true)}
                className="min-h-11 rounded-lg px-3 text-muted hover:bg-hover"
              >
                {t('decks.fromSearches.no')}
              </button>
            </div>
          )}
          <ul className="grid gap-1">
            {searches.map((s) => (
              <li
                key={s.id}
                className="flex min-h-11 items-center gap-2 text-sm"
              >
                <span className="me-auto min-w-0 truncate">{s.name}</span>
                <button
                  type="button"
                  data-make-deck={s.name}
                  onClick={() =>
                    setEditing({ initial: deckDraftFromSearch(s) })
                  }
                  className="min-h-11 rounded-lg border border-line px-3 hover:bg-hover"
                >
                  {t('decks.makeDeck')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {paused.length > 0 && (
        <div className="mt-6" data-paused-list>
          <h3 className="mb-1 text-xs font-medium text-muted">
            {t('decks.paused')}
          </h3>
          <p className="mb-1 text-xs text-muted">{t('decks.paused.hint')}</p>
          <ul className="grid gap-1">
            {paused.map((item) => (
              <li
                key={item.id}
                className="flex min-h-11 items-center gap-2 text-sm"
              >
                <span className="me-auto min-w-0 truncate">{item.title}</span>
                <button
                  type="button"
                  onClick={() => runTask(resumeItem(db, item.kind, item.id))}
                  aria-label={t('decks.resumeNamed', { name: item.title })}
                  className="min-h-11 rounded-lg border border-line px-3 hover:bg-hover"
                >
                  {t('pause.resume')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <DeckEditor
          db={db}
          deck={editing.deck}
          initial={editing.initial}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={t('decks.deleteConfirm', { name: deleting.name })}
          confirmLabel={t('decks.delete')}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const id = deleting.id
            setDeleting(null)
            runTask(deleteDeck(db, id))
          }}
        />
      )}
    </section>
  )
}

function DeckTile({
  db,
  now,
  name,
  colour,
  scope,
  onStudy,
  onEdit,
  onDelete,
}: {
  db: LearningNotesDB
  now: number
  name: string
  colour?: string
  scope: ReviewScope
  onStudy: (scope: ReviewScope) => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const key = JSON.stringify(scope)
  const counts = useLiveQuery(() => scopeCounts(db, scope, now), [db, key, now])
  const total = counts ? counts.new + counts.learning + counts.due : 0
  return (
    <li
      data-deck-tile={name}
      className="rounded-xl border border-line p-3"
      style={
        colour
          ? { borderInlineStartColor: colour, borderInlineStartWidth: 4 }
          : undefined
      }
    >
      <div className="mb-2 flex items-center gap-1">
        <strong className="me-auto min-w-0 truncate text-sm">{name}</strong>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={t('decks.editNamed', { name })}
            className="grid size-11 place-items-center rounded-lg text-muted hover:bg-hover"
          >
            ✎
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('decks.deleteNamed', { name })}
            className="grid size-11 place-items-center rounded-lg text-muted hover:bg-hover"
          >
            🗑
          </button>
        )}
      </div>
      <dl className="mb-3 grid grid-cols-3 gap-1 text-center">
        {(['new', 'learning', 'due'] as const).map((k) => (
          <div key={k}>
            <dd
              data-count={k}
              className="text-lg font-semibold tabular-nums"
              style={{ color: k === 'new' ? 'var(--color-accent)' : undefined }}
            >
              {counts?.[k] ?? 0}
            </dd>
            <dt className="text-[11px] text-muted">{t(`decks.state.${k}`)}</dt>
          </div>
        ))}
      </dl>
      <button
        type="button"
        data-study
        disabled={!!counts && total === 0}
        aria-label={t('decks.studyNamed', { name })}
        onClick={() => onStudy(scope)}
        className="min-h-11 w-full rounded-lg bg-accent px-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
      >
        {t('decks.study')}
      </button>
    </li>
  )
}
