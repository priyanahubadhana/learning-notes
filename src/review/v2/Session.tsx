import { useContext, useEffect, useRef, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { onRouted } from '../../app/input/eventRouter'
import type { LearningNotesDB } from '../../core/db'
import type { Rating } from '../../core/types'
import { t } from '../../i18n/t'
import { SourceLine } from '../../recall/SourceLine'
import { getPracticeCards, type ReviewScope } from '../../recall/reviewService'
import { RATINGS } from '../../recall/scheduler'
import { useUnlocked } from '../../settings/level'
import { EmptyState } from '../../design/parts/EmptyState'
import { CardFace } from './faces/CardFace'
import { countdown, intervalLabel } from './format'
import { useSession } from './useSession'

const RATING_KEYS = ['1', '2', '3', '4']

export interface SessionProps {
  db: LearningNotesDB
  scope: ReviewScope
  /** The screen's title (for the label and the line under the buttons). */
  title: string
  /** Show the scope name in the bar (not for "all"). */
  showTitle: boolean
  startInPractice: boolean
  /** True while the phone menu covers this screen: keys are for the menu. */
  keysPaused: boolean
  onOpenNote: (pageId: string, blockId: string) => void
  onOpenAnnotation?: (annotationId: string) => void
  onClose: () => void
}

/** The study session: flip card, Show answer, the four buttons, Waiting, Done. */
export function Session(props: SessionProps) {
  const { db, scope, title, showTitle, onClose, onOpenAnnotation } = props
  const ui = useContext(AppUiContext)
  const s = useSession(db, scope, props.startInPractice)
  const { card, face, revealed } = s
  const extras = useUnlocked('rev.sessionExtras')
  const hints = useUnlocked('rev.keyHints')

  const doUndo = () =>
    runTask(
      s.undo().then((result) => {
        if (result === 'ok') ui.toast(t('rv2.undone'))
        else if (result === 'changed') ui.toast(t('rv2.undoRefused'))
      }),
    )
  const doSuspend = () =>
    runTask(
      s.suspend().then((suspended) => {
        if (!suspended) return
        ui.toast(t('review.suspended'), {
          label: t('review.undo'),
          onSelect: () => runTask(s.unsuspend(suspended)),
        })
      }),
    )

  // Keys go through the app's one event router (never a private listener).
  const keyState = useRef({ ...props, ...s, extras, doUndo })
  useEffect(() => {
    keyState.current = { ...props, ...s, extras, doUndo }
  })
  useEffect(
    () =>
      onRouted(
        'keydown',
        (e) => {
          const k = keyState.current
          if (k.keysPaused) return false
          const target = e.target as HTMLElement | null
          if (
            target?.closest?.(
              'input, textarea, select, [contenteditable="true"]',
            )
          )
            return false
          // Ctrl / Cmd + Z undoes the last rating (Professional extras).
          if (
            k.extras &&
            (e.ctrlKey || e.metaKey) &&
            !e.altKey &&
            !e.shiftKey &&
            e.key.toLowerCase() === 'z'
          ) {
            e.preventDefault()
            k.doUndo()
            return true
          }
          if (e.ctrlKey || e.metaKey || e.altKey) return false
          if (e.key === 'Escape') {
            k.onClose()
            return true
          }
          if (!k.card || !k.face) return false
          if (!k.revealed && (e.key === ' ' || e.key === 'Enter')) {
            if (target?.closest?.('button')) return false // the focused button handles it
            e.preventDefault()
            k.reveal()
            return true
          }
          const index = RATING_KEYS.indexOf(e.key)
          if (k.revealed && index >= 0) {
            e.preventDefault()
            k.rate(RATINGS[index])
            return true
          }
          return false
        },
        { name: 'review.v2.session' },
      ),
    [],
  )

  const hasCards = useLiveQuery(
    async () => (await getPracticeCards(db, scope, 1)).length > 0,
    [db, JSON.stringify(scope)],
  )

  const bar = (
    <header className="rv2-bar">
      <button
        type="button"
        className="rv2-x"
        aria-label={t('review.close')}
        data-testid="rv2-close"
        onClick={onClose}
      >
        ×
      </button>
      <div className="rv2-bar__mid">
        {showTitle && <span className="rv2-bar__title">{title}</span>}
        {s.left > 0 && (
          <span data-testid="rv2-left">
            {t('review.left', { count: s.left })}
          </span>
        )}
      </div>
      <span className="rv2-spacer" aria-hidden />
    </header>
  )
  const done = s.total - s.left
  const progress = (
    <div
      className="rv2-prog"
      role="progressbar"
      aria-label={title}
      aria-valuemin={0}
      aria-valuemax={Math.max(1, s.total)}
      aria-valuenow={Math.max(0, done)}
    >
      <b
        style={{
          width: `${s.total ? Math.round((done / s.total) * 100) : 0}%`,
        }}
      />
    </div>
  )

  let body
  if (s.failed) {
    body = (
      <EmptyState
        kind="error"
        text={t('rv2.loadError')}
        action={t('rv2.tryAgain')}
        onAction={s.retry}
        testId="rv2-error"
      />
    )
  } else if (!s.session) {
    body = <div className="rv2-skel" aria-hidden />
  } else if (card && face) {
    body = (
      <>
        <CardFace key={card.id} face={face} revealed={revealed} />
        {s.practising && <p className="rv2-hint">{t('review.practising')}</p>}
        {card.sourceAnnotationId && onOpenAnnotation && (
          <SourceLine
            db={db}
            annotationId={card.sourceAnnotationId}
            onOpen={onOpenAnnotation}
          />
        )}
      </>
    )
  } else if (card) {
    body = <div className="rv2-skel" aria-hidden />
  } else if (s.waitingAt !== null) {
    body = (
      <div className="rv2-msg" data-testid="rv2-waiting">
        <p>{t('rv2.waitingNow', { count: s.session.waiting.length })}</p>
        <p className="rv2-clock" role="timer" aria-live="off">
          {countdown(s.waitingAt - s.now)}
        </p>
        <p className="rv2-hint">{t('review.waitingHint')}</p>
      </div>
    )
  } else {
    body = (
      <Done
        reviewed={s.session.done}
        scope={scope}
        hasCards={hasCards ?? true}
        onPractice={s.practice}
        onClose={onClose}
        undo={
          extras && s.canUndo ? (
            <UndoButton enabled onClick={doUndo} />
          ) : undefined
        }
      />
    )
  }

  return (
    <section
      aria-label={title}
      className="rv2"
      data-testid="rv2-session"
      data-revealed={revealed ? '1' : '0'}
    >
      {bar}
      {progress}
      <div className="rv2-scroll">
        <div className="rv2-col">{body}</div>
      </div>
      <div className="rv2-sr" role="status" aria-live="polite">
        {revealed && card ? t('rv2.answerShown') : ''}
      </div>
      {card && face && (
        <footer className="rv2-foot">
          <div>
            {!revealed ? (
              <button
                type="button"
                className="rv2-btn rv2-btn--pri rv2-btn--wide"
                data-testid="rv2-show"
                // Focused so Space / Enter shows the answer straight away.
                autoFocus
                onClick={s.reveal}
              >
                {t('review.show')}
                <kbd aria-hidden>Space</kbd>
              </button>
            ) : (
              <div
                role="group"
                aria-label={t('review.rateHint')}
                className="rv2-rates"
                data-testid="rv2-rates"
              >
                {RATINGS.map((rating: Rating, i) => {
                  const name = t(`review.rating.${rating}`)
                  const gap =
                    !s.practising && s.preview
                      ? intervalLabel(s.preview.states[rating], s.preview.at)
                      : String(i + 1)
                  return (
                    <button
                      key={rating}
                      type="button"
                      className={`rv2-rate${
                        rating === 'again'
                          ? ' rv2-rate--again'
                          : rating === 'good'
                            ? ' rv2-rate--good'
                            : ''
                      }`}
                      data-rating={rating}
                      aria-disabled={s.pending || undefined}
                      aria-label={
                        !s.practising && s.preview
                          ? t('rv2.rateLabel', { rating: name, gap })
                          : name
                      }
                      onClick={() => s.rate(rating)}
                    >
                      {name}
                      <small>{gap}</small>
                    </button>
                  )
                })}
              </div>
            )}
            {extras && (
              <div className="rv2-xrow" data-testid="rv2-extras">
                <button
                  type="button"
                  className="rv2-btn rv2-btn--sm"
                  data-testid="rv2-open-note"
                  onClick={() => props.onOpenNote(card.pageId, card.blockId)}
                >
                  {t('review.openNote')}
                </button>
                <button
                  type="button"
                  className="rv2-btn rv2-btn--sm"
                  data-testid="rv2-suspend"
                  onClick={doSuspend}
                >
                  {t('review.suspend')}
                </button>
                <UndoButton enabled={s.canUndo} onClick={doUndo} />
              </div>
            )}
            {hints && (
              <p className="rv2-keys" data-testid="rv2-keyhints">
                {t('rv2.keyHints')}
              </p>
            )}
          </div>
        </footer>
      )}
    </section>
  )
}

function UndoButton({
  enabled,
  onClick,
}: {
  enabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="rv2-btn rv2-btn--sm"
      data-testid="rv2-undo"
      disabled={!enabled}
      onClick={onClick}
    >
      {t('rv2.undoRating')}
    </button>
  )
}

function Done({
  reviewed,
  scope,
  hasCards,
  onPractice,
  onClose,
  undo,
}: {
  reviewed: number
  scope: ReviewScope
  hasCards: boolean
  onPractice: () => void
  onClose: () => void
  /** Professional: Undo rating, laid out with the other buttons (one row, or stacked on a phone). */
  undo?: ReactNode
}) {
  const canPractice = scope.kind !== 'wrong' && hasCards
  if (reviewed === 0) {
    return (
      <EmptyState
        testId="rv2-empty"
        icon={canPractice ? 'circleCheck' : 'cards'}
        text={
          scope.kind === 'wrong'
            ? t('review.wrongEmpty')
            : hasCards
              ? t('review.nothingDue')
              : t('review.noCards')
        }
        action={canPractice ? t('review.practice') : t('review.close')}
        onAction={canPractice ? onPractice : onClose}
      />
    )
  }
  return (
    <div className="rv2-msg" data-testid="rv2-done">
      <h2>{t('rv2.allDone')}</h2>
      <p className="rv2-hint">{t('rv2.youReviewed', { count: reviewed })}</p>
      <div className="rv2-row rv2-row--done">
        {canPractice && (
          <button
            type="button"
            className="rv2-btn rv2-btn--pri"
            data-testid="rv2-practice"
            onClick={onPractice}
          >
            {t('review.practice')}
          </button>
        )}
        <button type="button" className="rv2-btn" onClick={onClose}>
          {t('review.close')}
        </button>
        {undo}
      </div>
    </div>
  )
}
