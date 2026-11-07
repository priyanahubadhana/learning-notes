import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../../core/db'
import { scopeCounts, type ReviewScope } from '../../recall/reviewService'
import { t } from '../../i18n/t'

/** The three views of a page (Phase M): its notes, its Summary, its cards. */
export type PageTab = 'notes' | 'summary' | 'review'

const TABS: {
  id: PageTab
  label: 'summary.seg.notes' | 'summary.seg.summary' | 'summary.seg.review'
}[] = [
  { id: 'notes', label: 'summary.seg.notes' },
  { id: 'summary', label: 'summary.seg.summary' },
  { id: 'review', label: 'summary.seg.review' },
]

/** Notes · Summary · Review, under the page title. Buttons are 44 px tall. */
export function Segments({
  tab,
  onTab,
  className = '',
}: {
  tab: PageTab
  onTab: (tab: PageTab) => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={t('summary.seg.label')}
      data-page-tabs
      className={`inline-flex rounded-xl border border-line bg-soft p-0.5 ${className}`}
    >
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={tab === id}
          data-page-tab={id}
          onClick={() => onTab(id)}
          className="min-h-9 any-pointer-coarse:min-h-11 rounded-[10px] px-4 text-sm text-ink-soft hover:text-ink aria-pressed:bg-bg aria-pressed:font-semibold aria-pressed:text-ink aria-pressed:shadow-sm"
        >
          {t(label)}
        </button>
      ))}
    </div>
  )
}

/** A page's Review view: what is due and a Practise button. */
export function PageReview({
  db,
  pageId,
  onReview,
}: {
  db: LearningNotesDB
  pageId: string
  onReview: (scope: ReviewScope) => void
}) {
  const scope: ReviewScope = { kind: 'page', pageId, includeSubpages: true }
  const counts = useLiveQuery(() => scopeCounts(db, scope), [db, pageId])
  if (!counts) return null
  const due = counts.due + counts.learning
  return (
    <section aria-label={t('summary.seg.review')} className="grid gap-3">
      <p className="text-[15px]" data-review-counts>
        {t('summary.review.counts', { due, new: counts.new })}
      </p>
      {due + counts.new === 0 && (
        <p className="text-sm text-muted">{t('summary.review.none')}</p>
      )}
      <div>
        <button
          type="button"
          onClick={() => onReview(scope)}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
        >
          {t('summary.review.practice')}
        </button>
      </div>
    </section>
  )
}
