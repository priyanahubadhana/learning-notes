import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { EmptyState } from '../../design/parts/EmptyState'
import {
  getPracticeCards,
  scopeCounts,
  type ReviewScope,
} from '../../recall/reviewService'
import { useLevel, useUnlocked } from '../../settings/level'
import { Chips } from './Chips'
import { homeExtras } from './homeExtras'
import { ReviewMoreSheet } from './MoreSheet'

export interface HomeProps {
  db: LearningNotesDB
  scope: ReviewScope
  /** Professional chips change the scope (Home counts and Start follow it). */
  onScope?: (scope: ReviewScope) => void
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
  onScope,
  onStart,
  onPractice,
  onOpenNotebooks,
}: HomeProps) {
  const pro = useLevel() === 'professional'
  const moreOn = useUnlocked('rev.moreSheet')
  const decksOn = useUnlocked('rev.decks')
  const [more, setMore] = useState(false)
  const data = useLiveQuery(async () => {
    const [counts, any] = await Promise.all([
      scopeCounts(db, scope),
      getPracticeCards(db, scope, 1),
    ])
    const extra = pro ? await homeExtras(db) : null
    // 'Got wrong' has no practice list, so it always shows its hero (Start is off at 0).
    return { counts, hasCards: scope.kind === 'wrong' || any.length > 0, extra }
  }, [db, JSON.stringify(scope), pro])

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
  const { counts, hasCards, extra } = data
  const total = counts.new + counts.learning + counts.due
  const eyebrow = !pro
    ? t('rv2.today')
    : scope.kind === 'wrong'
      ? t('rv2.chip.wrongName')
      : scope.kind === 'deck'
        ? (extra?.decks.find((d) => d.id === scope.deckId)?.name ??
          t('rv2.chip.all'))
        : t('rv2.chip.all')

  return (
    <section
      className="rv2 rv2-home"
      data-testid="rv2-home"
      aria-label={t('review.title')}
    >
      <div className="rv2-scroll">
        <div className="rv2-col">
          {pro && extra && (
            <Chips
              decks={decksOn ? extra.decks : []}
              wrongCount={extra.wrongCount}
              scope={scope}
              onScope={(s) => onScope?.(s)}
              onMore={moreOn ? () => setMore(true) : undefined}
            />
          )}
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
                <div className="rv2-hero__eb">{eyebrow}</div>
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
                {pro && scope.kind !== 'wrong' && (
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
              {pro && extra && (
                <p className="rv2-limits" data-testid="rv2-limits">
                  {t('rv2.limits', { count: extra.newLeft })}
                  {extra.reviewsLeft !== null &&
                    ` · ${t('rv2.limitsReviews', { count: extra.reviewsLeft })}`}
                  {' · '}
                  {t('rv2.paused', { count: extra.paused })}
                </p>
              )}
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
      {more && <ReviewMoreSheet onClose={() => setMore(false)} />}
    </section>
  )
}
