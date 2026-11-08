import { HelpLine, Tip } from '../help/Help'
import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { EmptyState } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import type { JsonValue, Rating } from '../core/types'
import { t } from '../i18n/t'
import {
  countsAsReview,
  getCardFace,
  getPracticeCards,
  getReviewQueue,
  previewCard,
  rateCard,
  suspendCard,
  unsuspendCard,
  type CardFace,
  type ReviewScope,
} from './reviewService'
import {
  afterRating,
  currentCard,
  nextWaitingAt,
  putBack,
  releaseWaiting,
  skipCurrent,
  startSession,
  type ReviewSession,
} from './reviewSession'
import { noteLinkProps, tagRefProps } from '../editor/mapping'
import { useImageUrl } from '../images/useImageUrl'
import { RATINGS } from './scheduler'
import { SourceLine } from './SourceLine'

/**
 * The Review screen: shows due cards one at a time. Space/Enter shows the
 * answer, keys 1–4 rate it, Esc closes. On phones it fills the screen with
 * the buttons pinned to the bottom.
 */

interface ReviewScreenProps {
  db: LearningNotesDB
  scope: ReviewScope
  /** True while the phone menu covers this screen: keys are for the menu. */
  keysPaused: boolean
  onScopeChange: (scope: ReviewScope) => void
  /** Opens the card's page and scrolls to the card. */
  onOpenNote: (pageId: string, blockId: string) => void
  /** Opens the highlight a card was made from (CR3). */
  onOpenAnnotation?: (annotationId: string) => void
  onClose: () => void
}

export function ReviewScreen({
  db,
  scope,
  keysPaused,
  onScopeChange,
  onOpenNote,
  onOpenAnnotation,
  onClose,
}: ReviewScreenProps) {
  const ui = useContext(AppUiContext)
  const [session, setSession] = useState<ReviewSession | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const shownAt = useRef(0)
  const busy = useRef(false)

  // The session starts from the due queue. (The parent remounts this
  // screen with a new `key` when the scope changes.)
  const scopeKey = JSON.stringify(scope)
  useEffect(() => {
    let live = true
    getReviewQueue(db, scope).then(
      (q) => live && setSession(startSession(q.cards)),
      (error: unknown) => console.error('Could not load reviews', error),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by scopeKey
  }, [db, scopeKey])

  const card = session ? currentCard(session) : null
  const waitingAt = session ? nextWaitingAt(session) : null

  // Restart the answer timer whenever a card is shown.
  useEffect(() => {
    shownAt.current = Date.now()
  }, [card?.id, session?.done])

  // Only waiting cards left: count down, then bring them back.
  useEffect(() => {
    if (card || waitingAt === null) return
    const timer = setInterval(() => {
      const time = Date.now()
      setNow(time)
      if (time >= waitingAt) setSession((s) => s && releaseWaiting(s, time))
    }, 1000)
    return () => clearInterval(timer)
  }, [card, waitingAt])

  const face = useLiveQuery(
    async () => (card ? getCardFace(db, card) : null),
    [card?.id],
  )
  // Live: re-runs when settings change, so intervals always match them.
  const preview = useLiveQuery(async () => {
    if (!card) return null
    const at = Date.now()
    const [states, counts] = await Promise.all([
      previewCard(db, card, at),
      countsAsReview(db, card, at),
    ])
    return { at, states, counts }
  }, [card?.id, card?.due])
  const scopeName = useLiveQuery(async () => {
    if (scope.kind === 'page') return (await db.pages.get(scope.pageId))?.title
    if (scope.kind === 'notebook')
      return (await db.notebooks.get(scope.notebookId))?.title
    if (scope.kind === 'blocks') return scope.name
    if (scope.kind === 'deck') return (await db.decks.get(scope.deckId))?.name
    return undefined
  }, [scopeKey])
  const hasCards = useLiveQuery(
    async () => (await getPracticeCards(db, scope, 1)).length > 0,
    [scopeKey],
  )

  // Practice (not due, or a new card past today's limit): schedule unchanged.
  const practising = preview?.counts === false

  const reveal = () => setRevealed(true)

  const rate = async (rating: Rating) => {
    if (!card || busy.current) return
    busy.current = true
    try {
      const time = Date.now()
      const { card: after, log } = await rateCard(db, card.id, rating, {
        durationMs: time - shownAt.current,
        now: time,
      })
      const wasDue = log.kind === 'review'
      setSession(
        (s) => s && releaseWaiting(afterRating(s, rating, after, wasDue), time),
      )
      setRevealed(false)
    } finally {
      busy.current = false
    }
  }

  const suspend = async () => {
    if (!card) return
    const suspended = card
    await suspendCard(db, suspended.id)
    setSession((s) => s && skipCurrent(s))
    setRevealed(false)
    ui.toast(t('review.suspended'), {
      label: t('review.undo'),
      onSelect: () =>
        runTask(
          (async () => {
            await unsuspendCard(db, suspended.id)
            setSession((s) => s && putBack(s, suspended))
          })(),
        ),
    })
  }

  const practice = async () => {
    const cards = await getPracticeCards(db, scope)
    setRevealed(false)
    setSession(startSession(cards))
  }

  // Keyboard (handler in a ref so it always sees fresh state).
  const onKey = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    onKey.current = (e) => {
      if (keysPaused || e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable="true"]')) return
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (!card) return
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        if (target.closest('button')) return // the focused button handles it
        e.preventDefault()
        reveal()
        return
      }
      const index = ['1', '2', '3', '4'].indexOf(e.key)
      if (revealed && index >= 0) {
        e.preventDefault()
        runTask(rate(RATINGS[index]))
      }
    }
  })
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey.current(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  const title =
    scope.kind === 'wrong'
      ? t('review.titleWrong')
      : scope.kind === 'all'
        ? t('review.title')
        : t(
            scope.kind === 'notebook'
              ? 'review.titleNotebook'
              : scope.kind === 'deck'
                ? 'review.titleDeck'
                : 'review.titlePage',
            {
              name: scopeName || t('review.untitled'),
            },
          )
  const left = session ? session.queue.length + session.waiting.length : 0

  return (
    <section aria-label={title} className="flex h-full flex-col bg-bg text-ink">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2.5 phone:grid phone:grid-cols-[minmax(0,1fr)_auto] phone:gap-x-1">
        {/* On phones a grid, so the top line can never wrap: the title goes
            below the menu button, across the whole screen. */}
        <div className="flex min-w-0 flex-1 items-center gap-3 phone:col-span-2 phone:row-start-2">
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
            {title}
          </h1>
          {left > 0 && (
            <span className="text-[13px] whitespace-nowrap text-muted tabular-nums">
              {t('review.left', { count: left })}
            </span>
          )}
        </div>
        {(scope.kind === 'all' || scope.kind === 'wrong') && (
          <Tip
            id="review.scope"
            className="inline-flex min-w-0 items-center gap-0.5 phone:row-start-1"
          >
            <div
              role="group"
              aria-label={t('review.scope')}
              className="flex min-w-0 rounded-lg border border-line p-0.5 text-[13px]"
            >
              {(['all', 'wrong'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={scope.kind === kind}
                  onClick={() => onScopeChange({ kind })}
                  className={`min-h-8 min-w-0 truncate rounded-md px-2.5 phone:px-1.5 ${
                    scope.kind === kind ? 'bg-soft font-medium' : 'text-muted'
                  }`}
                >
                  {t(`review.scope.${kind}`)}
                </button>
              ))}
            </div>
          </Tip>
        )}
        <Tip
          id="review.close"
          touchInfo={false}
          className="inline-flex items-center gap-0.5 phone:col-start-2 phone:row-start-1 phone:-me-3"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={t('review.close')}
            className="flex size-11 items-center justify-center rounded-lg text-lg text-muted hover:bg-hover hover:text-ink"
          >
            ×
          </button>
        </Tip>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-6 phone:py-4">
        <div className="mx-auto max-w-[640px]">
          {!session ? null : card && face ? (
            <>
              <CardView face={face} revealed={revealed} />
              {practising && (
                <p className="mt-3 text-center text-[13px] text-muted">
                  {t('review.practising')}
                </p>
              )}
              {card.sourceAnnotationId && onOpenAnnotation && (
                <SourceLine
                  db={db}
                  annotationId={card.sourceAnnotationId}
                  onOpen={onOpenAnnotation}
                />
              )}
              <div className="mt-3 flex justify-center gap-2 text-[13px]">
                <Tip id="review.openNote">
                  <QuietButton
                    onClick={() => onOpenNote(card.pageId, card.blockId)}
                  >
                    {t('review.openNote')}
                  </QuietButton>
                </Tip>
                <Tip id="review.suspend">
                  <QuietButton onClick={() => runTask(suspend())}>
                    {t('review.suspend')}
                  </QuietButton>
                </Tip>
              </div>
            </>
          ) : card ? null : waitingAt !== null ? (
            <Message>
              <p className="text-[15px]">
                {t('review.waiting', {
                  count: session.waiting.length,
                  time: countdown(waitingAt - now),
                })}
              </p>
              <p className="text-[13px] text-muted">
                {t('review.waitingHint')}
              </p>
            </Message>
          ) : (
            <Finished
              reviewed={session.done}
              emptyMessage={
                scope.kind === 'wrong'
                  ? t('review.wrongEmpty')
                  : (hasCards ?? true)
                    ? t('review.nothingDue')
                    : t('review.noCards')
              }
              canPractice={scope.kind !== 'wrong' && (hasCards ?? true)}
              onPractice={() => runTask(practice())}
              onClose={onClose}
            />
          )}
        </div>
      </div>

      {card && face && (
        <footer className="border-t border-line px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-[640px]">
            {!revealed ? (
              <Tip id="review.show" className="flex w-full items-center gap-1">
                <button
                  type="button"
                  // Focused so Space/Enter shows the answer straight away.
                  autoFocus
                  onClick={reveal}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-medium text-white hover:opacity-90"
                >
                  {t('review.show')}
                  <kbd className="rounded bg-white/20 px-1.5 font-mono text-[11px]">
                    Space
                  </kbd>
                </button>
              </Tip>
            ) : (
              <Tip id="review.ratings" className="block">
                <div
                  role="group"
                  aria-label={t('review.rateHint')}
                  className="grid grid-cols-4 gap-2"
                >
                  {RATINGS.map((rating, i) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => runTask(rate(rating))}
                      className={`flex min-h-14 flex-col items-center justify-center rounded-xl border bg-bg px-1 transition-colors hover:bg-hover ${
                        rating === 'again'
                          ? 'border-line text-danger'
                          : rating === 'good'
                            ? 'border-accent text-accent'
                            : 'border-line'
                      }`}
                    >
                      <span className="text-[15px] font-medium">
                        {t(`review.rating.${rating}`)}
                      </span>
                      <span className="text-[12px] text-muted tabular-nums">
                        {!practising && preview
                          ? intervalLabel(preview.states[rating], preview.at)
                          : i + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </Tip>
            )}
            {revealed && (
              <HelpLine
                id="review.ratings"
                className="mt-2 text-center text-xs text-muted"
              />
            )}
          </div>
        </footer>
      )}
    </section>
  )
}

/** "10 min" while in short steps (no day gap yet), "3 days" otherwise. */
function intervalLabel(
  next: { due: number; intervalDays: number },
  at: number,
): string {
  if (next.intervalDays === 0) {
    const minutes = Math.max(1, Math.round((next.due - at) / 60_000))
    return t('interval.minutes', { count: minutes })
  }
  return t('interval.days', { count: next.intervalDays })
}

/** m:ss for the waiting countdown. */
function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return t('interval.countdown', {
    m: Math.floor(total / 60),
    s: String(total % 60).padStart(2, '0'),
  })
}

function CardView({ face, revealed }: { face: CardFace; revealed: boolean }) {
  return (
    <article className="rounded-2xl border border-line bg-bg px-5 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:px-7">
      {face.kind === 'blank' && (
        <p className="mb-2 text-[11px] tracking-[0.06em] text-muted uppercase">
          {t('review.blank')}
        </p>
      )}
      <p className="text-lg leading-relaxed break-words">
        <Runs
          runs={face.text}
          hiddenBlank={revealed ? undefined : face.blankId}
          shownBlank={revealed ? face.blankId : undefined}
        />
      </p>
      {face.kind === 'card' && revealed && (
        <div className="mt-5 border-t border-line pt-5 text-[16px] leading-relaxed break-words">
          {face.answer.length === 0 ? (
            <p className="text-muted">{t('review.noAnswer')}</p>
          ) : (
            face.answer.map((b) =>
              b.image ? (
                <AnswerPicture key={b.id} source={b.image} depth={b.depth} />
              ) : (
                <p
                  key={b.id}
                  style={{ paddingInlineStart: b.depth * 18 }}
                  className="mb-1.5 min-h-[1lh]"
                >
                  <Runs runs={b.text} />
                </p>
              ),
            )
          )}
        </div>
      )}
      <p className="mt-5 text-[12px] text-muted">
        {t('review.from', { page: face.pageTitle || t('review.untitled') })}
      </p>
    </article>
  )
}

type Run = {
  type?: string
  text?: string
  styles?: Record<string, unknown>
  content?: JsonValue
}

const asRuns = (value: JsonValue | undefined): Run[] =>
  Array.isArray(value)
    ? value.filter(
        (r): r is Run & JsonValue =>
          !!r && typeof r === 'object' && !Array.isArray(r),
      )
    : []

/**
 * Read-only text of a block. The blank being asked is shown as "…" (all
 * its words collapse into one gap) or highlighted once revealed.
 */
/** A picture in a card's answer (E2: a vivid image to recall). */
function AnswerPicture({ source, depth }: { source: string; depth: number }) {
  const url = useImageUrl(source)
  if (!url) return null
  return (
    <img
      src={url}
      alt=""
      data-answer-picture
      style={{ marginInlineStart: depth * 18 }}
      className="mb-1.5 max-h-72 max-w-full rounded-lg object-contain"
    />
  )
}

function Runs({
  runs,
  hiddenBlank,
  shownBlank,
}: {
  runs: JsonValue | undefined
  hiddenBlank?: string
  shownBlank?: string
}) {
  const out: ReactNode[] = []
  let previousHidden = false
  asRuns(runs).forEach((run, i) => {
    if (run.type === 'link') {
      out.push(
        <span key={i} className="underline decoration-line underline-offset-2">
          <Runs
            runs={run.content}
            hiddenBlank={hiddenBlank}
            shownBlank={shownBlank}
          />
        </span>,
      )
      previousHidden = false
      return
    }
    if (tagRefProps(run as JsonValue)) return // tags are not shown in review
    const link = noteLinkProps(run as JsonValue)
    if (link) {
      // Its label is the current title (see getCardFace).
      out.push(
        <span key={i} className="note-link">
          {link.label}
        </span>,
      )
      previousHidden = false
      return
    }
    const styles = run.styles ?? {}
    const blank = typeof styles.blank === 'string' ? styles.blank : undefined
    if (blank && blank === hiddenBlank) {
      if (!previousHidden) {
        out.push(
          <span key={i} className="review-blank" aria-label={t('review.blank')}>
            …
          </span>,
        )
      }
      previousHidden = true
      return
    }
    previousHidden = false
    let node: ReactNode = run.text ?? ''
    if (styles.code)
      node = <code className="font-mono text-[0.9em]">{node}</code>
    if (styles.bold) node = <strong>{node}</strong>
    if (styles.italic) node = <em>{node}</em>
    if (styles.underline) node = <u>{node}</u>
    if (styles.strike) node = <s>{node}</s>
    if (blank && blank === shownBlank) {
      node = <mark className="recall-blank text-ink">{node}</mark>
    }
    out.push(<span key={i}>{node}</span>)
  })
  return <>{out}</>
}

function Finished({
  reviewed,
  emptyMessage,
  canPractice,
  onPractice,
  onClose,
}: {
  reviewed: number
  emptyMessage: string
  canPractice: boolean
  onPractice: () => void
  onClose: () => void
}) {
  return (
    <Message>
      {reviewed > 0 ? (
        <p className="text-[17px] font-semibold">{t('review.done')}</p>
      ) : (
        <EmptyState
          testId="review-empty"
          icon={canPractice ? '✅' : '🃏'}
          text={emptyMessage}
          action={canPractice ? t('review.practice') : t('review.back')}
          onAction={canPractice ? onPractice : onClose}
        />
      )}
      {reviewed > 0 && (
        <p className="text-[13px] text-muted">
          {t('review.doneCount', { count: reviewed })}
        </p>
      )}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {canPractice && reviewed > 0 && (
          <Tip id="review.practice">
            <button
              type="button"
              onClick={onPractice}
              className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
            >
              {t('review.practice')}
            </button>
          </Tip>
        )}
        {(reviewed > 0 || canPractice) && (
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover"
          >
            {t('review.back')}
          </button>
        )}
      </div>
      {canPractice && (
        <HelpLine id="review.practice" className="text-[12px] text-muted" />
      )}
    </Message>
  )
}

function Message({ children }: { children: ReactNode }) {
  return (
    <div className="mt-[12vh] flex flex-col items-center gap-2 text-center">
      {children}
    </div>
  )
}

function QuietButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-lg px-3 text-muted hover:bg-hover hover:text-ink"
    >
      {children}
    </button>
  )
}
