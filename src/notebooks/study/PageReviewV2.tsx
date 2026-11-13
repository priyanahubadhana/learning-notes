import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { pageCounts } from '../../recall/reviewLazy'
import { StudyTabHeader } from './StudyTabHeader'
import './PageReviewV2.css'

/**
 * A page's Review tab (slice 15, flag study.v2, ST10): the shared header,
 * Due, New and Learned counts and one Practise button.
 */
export default function PageReviewV2({
  db,
  pageId,
  onReview,
}: {
  db: LearningNotesDB
  pageId: string
  onReview: () => void
}) {
  const counts = useLiveQuery(
    () => pageCounts(db, { kind: 'page', pageId, includeSubpages: true }),
    [db, pageId],
  )
  if (!counts) return null
  const total = counts.due + counts.new + counts.learned
  const tiles = [
    ['due', 'st2.status.due', counts.due],
    ['new', 'st2.status.new', counts.new],
    ['learned', 'st2.status.later', counts.learned],
  ] as const
  return (
    <section aria-label={t('summary.seg.review')} className="page-review">
      <StudyTabHeader
        title={t('summary.seg.review')}
        count={total}
        countLabel={t('st2.cardsCount', { count: total })}
        action={
          <button
            type="button"
            className="study-header__action"
            onClick={onReview}
          >
            {t('summary.review.practice')}
          </button>
        }
      />
      <ul className="page-review__tiles">
        {tiles.map(([id, label, n]) => (
          <li key={id} className="page-review__tile" data-testid={`rv-${id}`}>
            <span className="page-review__n">{n}</span>
            <span className="page-review__label">{t(label)}</span>
          </li>
        ))}
      </ul>
      {total === 0 && (
        <p className="page-review__none">{t('summary.review.none')}</p>
      )}
    </section>
  )
}
