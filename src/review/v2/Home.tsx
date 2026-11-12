import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { EmptyState } from '../../design/parts/EmptyState'
import {
  getPracticeCards,
  scopeCounts,
  type ReviewScope,
} from '../../recall/reviewService'
import { useLevel } from '../../settings/level'

export interface HomeProps {
  db: LearningNotesDB
  scope: ReviewScope
  onStart: (scope: ReviewScope) => void
  onPractice: (scope: ReviewScope) => void
  onOpenNotebooks?: () => void
}

/**
 * Review home. Beginner: one card, "Today / 12 / cards are ready" and one big
 * Start button. Professional: the same hero plus New / Learning / Due and
 * Practice anyway (the More button and the chips come with the next part).
 */
export function Home({
  db,
  scope,
  onStart,
  onPractice,
  onOpenNotebooks,
}: HomeProps) {
  const pro = useLevel() === 'professional'
  const data = useLiveQuery(async () => {
    const [counts, any] = await Promise.all([
      scopeCounts(db, scope),
      getPracticeCards(db, scope, 1),
    ])
    return { counts, hasCards: any.length > 0 }
  }, [db, JSON.stringify(scope)])

  if (!data) {
    return (
      <div className="rv2 rv2-home" data-testid="rv2-home" data-loading="1">
        <div className="rv2-scroll">
          <div className="rv2-col">
            <div className="rv2-skel" aria-hidden />
          </div>
        </div>
      </div>
    )
  }
  const { counts, hasCards } = data
  const total = counts.new + counts.learning + counts.due

  return (
    <section
      className="rv2 rv2-home"
      data-testid="rv2-home"
      aria-label={t('review.title')}
    >
      <div className="rv2-scroll">
        <div className="rv2-col">
          {!hasCards ? (
            <EmptyState
              testId="rv2-no-cards"
              icon="cards"
              text={t('rv2.noCardsYet')}
              action={onOpenNotebooks ? t('rv2.openNotebooks') : undefined}
              onAction={onOpenNotebooks}
            />
          ) : (
            <>
              <div className="rv2-hero" data-testid="rv2-hero">
                <div className="rv2-hero__eb">{t('rv2.today')}</div>
                <div className="rv2-hero__num" data-testid="rv2-count">
                  {total}
                </div>
                <div className="rv2-hero__lbl">
                  {pro ? t('rv2.readyPro') : t('rv2.ready', { count: total })}
                </div>
                {pro && (
                  <div className="rv2-counts" data-testid="rv2-counts">
                    <div>
                      <b>{counts.new}</b>
                      <span>{t('rv2.counts.new')}</span>
                    </div>
                    <div>
                      <b>{counts.learning}</b>
                      <span>{t('rv2.counts.learning')}</span>
                    </div>
                    <div>
                      <b>{counts.due}</b>
                      <span>{t('rv2.counts.due')}</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="rv2-btn rv2-btn--pri rv2-btn--wide"
                  data-testid="rv2-start"
                  disabled={total === 0}
                  onClick={() => onStart(scope)}
                >
                  {t('rv2.start')}
                </button>
                {pro && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="rv2-btn rv2-btn--sm rv2-btn--wide"
                      data-testid="rv2-practice-home"
                      onClick={() => onPractice(scope)}
                    >
                      {t('review.practice')}
                    </button>
                  </div>
                )}
              </div>
              {total === 0 && (
                <EmptyState
                  variant="inline"
                  testId="rv2-nothing"
                  icon="circleCheck"
                  text={t('rv2.nothingToday')}
                  action={pro ? undefined : t('review.practice')}
                  onAction={pro ? undefined : () => onPractice(scope)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
