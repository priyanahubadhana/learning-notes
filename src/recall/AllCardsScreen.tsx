import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import type { SearchHit } from '../search/searchQuery'
import { CardsTab } from './CardsTab'
import type { ReviewScope } from './reviewService'

/** "All cards": the Cards tab for every notebook together. */
export function AllCardsScreen({
  db,
  onOpenHit,
  onReview,
  onClose,
}: {
  db: LearningNotesDB
  onOpenHit: (hit: SearchHit) => void
  onReview: (scope: ReviewScope) => void
  onClose: () => void
}) {
  return (
    <div className="phone:fixed phone:inset-0 phone:z-30 phone:overflow-auto phone:bg-bg">
      <div className="mx-auto max-w-[1040px] px-4 pt-8 pb-24 phone:pt-3 md:px-12 md:pt-12">
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
        <CardsTab
          db={db}
          notebookId={null}
          onOpenHit={onOpenHit}
          onReview={onReview}
        />
      </div>
    </div>
  )
}
