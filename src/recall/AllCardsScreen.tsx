import type { LearningNotesDB } from '../core/db'
import { Segments, type PageTab } from '../app/summary/PageTabs'
import { t } from '../i18n/t'
import type { SearchHit } from '../search/searchQuery'
import { CardsTab } from './CardsTab'
import { ReviewHome } from './ReviewHome'
import type { ReviewScope } from './reviewService'

/**
 * "All cards": the Cards tab for every notebook together. With Summary and
 * Notes next to it (Phase M) it is the whole-app level of the three views;
 * Review is the screen as it always was.
 */
export function AllCardsScreen({
  db,
  onOpenHit,
  onReview,
  onClose,
  highlights,
  tab = 'review',
  onTab,
  summary,
  notes,
}: {
  db: LearningNotesDB
  onOpenHit: (hit: SearchHit) => void
  onReview: (scope: ReviewScope) => void
  onClose: () => void
  /** The daily highlight review tile (CR3), made by the reader feature. */
  highlights?: React.ReactNode
  /** The open view; Review unless the app says otherwise. */
  tab?: PageTab
  onTab?: (tab: PageTab) => void
  /** The whole-app Summary and Notes views, made by the app. */
  summary?: React.ReactNode
  notes?: React.ReactNode
}) {
  return (
    <div>
      <div className="mx-auto max-w-[1040px] px-4 pt-8 pb-24 md:px-12 md:pt-12">
        <div className="mb-4 flex items-start gap-2">
          <h1 className="flex-1 text-[26px] leading-tight font-bold tracking-[-0.02em]">
            {t('cards.allTitle')}
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('notebook.close')}
            className="hidden size-11 items-center justify-center rounded-lg text-lg text-muted hover:bg-hover hover:text-ink phone:flex"
          >
            ×
          </button>
        </div>
        {onTab && summary && notes && (
          <Segments tab={tab} onTab={onTab} className="mb-5" />
        )}
        {tab === 'summary' && summary}
        {tab === 'notes' && notes}
        {tab === 'review' && (
          <>
            {highlights}
            <ReviewHome db={db} onReview={onReview} />
            <CardsTab
              db={db}
              notebookId={null}
              onOpenHit={onOpenHit}
              onReview={onReview}
            />
          </>
        )}
      </div>
    </div>
  )
}
