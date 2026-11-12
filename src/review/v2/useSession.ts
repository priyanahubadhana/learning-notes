import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { runTask } from '../../app/errors'
import type { LearningNotesDB } from '../../core/db'
import type { Card, Rating } from '../../core/types'
import {
  countsAsReview,
  getCardFace,
  getPracticeCards,
  getReviewQueue,
  previewCard,
  rateCard,
  type ReviewScope,
} from '../../recall/reviewService'
import {
  afterRating,
  currentCard,
  nextWaitingAt,
  releaseWaiting,
  skipCurrent,
  startSession,
  type ReviewSession,
} from '../../recall/reviewSession'

/**
 * The study session: the same data calls as today's screen (`getReviewQueue`,
 * `rateCard`, `previewCard`, the in-memory `reviewSession`), moved out of the
 * view. The queue is always re-read from the database, so a reload in the
 * middle loses nothing: rated cards are already saved and drop out of it.
 */
export function useSession(
  db: LearningNotesDB,
  scope: ReviewScope,
  startInPractice: boolean,
) {
  const [session, setSession] = useState<ReviewSession | null>(null)
  const [total, setTotal] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)
  const shownAt = useRef(0)
  /** True while a rating is being saved: a second tap or key does nothing. */
  const busy = useRef(false)

  const scopeKey = JSON.stringify(scope)
  useEffect(() => {
    let live = true
    const load = startInPractice
      ? getPracticeCards(db, scope)
      : getReviewQueue(db, scope).then((q) => q.cards)
    load.then(
      (cards) => {
        if (!live) return
        setSession(startSession(cards))
        setTotal(cards.length)
      },
      (error: unknown) => {
        console.error('Could not load reviews', error)
        if (live) setFailed(true)
      },
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by scopeKey
  }, [db, scopeKey, startInPractice, attempt])

  const card: Card | null = session ? currentCard(session) : null
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

  // Both lookups carry the card id they were made for, so a slow answer
  // for the previous card is never shown on the next one.
  const faceResult = useLiveQuery(
    async () =>
      card ? { id: card.id, face: await getCardFace(db, card) } : null,
    [card?.id],
  )
  const face = faceResult && faceResult.id === card?.id ? faceResult.face : null
  const faceGone =
    !!faceResult && faceResult.id === card?.id && !faceResult.face
  // A card whose note was deleted is skipped (once per card).
  const [skipped, setSkipped] = useState<string | null>(null)
  if (faceGone && card && skipped !== card.id) {
    setSkipped(card.id)
    setSession((s) => s && skipCurrent(s))
  }

  // Live: re-runs when settings change, so the gaps always match them.
  const previewResult = useLiveQuery(async () => {
    if (!card) return null
    const at = Date.now()
    const [states, counts] = await Promise.all([
      previewCard(db, card, at),
      countsAsReview(db, card, at),
    ])
    return { id: card.id, at, states, counts }
  }, [card?.id, card?.due])
  const preview =
    previewResult && previewResult.id === card?.id ? previewResult : null

  /** Practice (not due, or a new card past today's limit): schedule unchanged. */
  const practising = preview?.counts === false
  const left = session ? session.queue.length + session.waiting.length : 0

  const reveal = useCallback(() => setRevealed(true), [])

  const rate = useCallback(
    async (rating: Rating) => {
      if (!card || busy.current) return
      busy.current = true
      setPending(true)
      try {
        const time = Date.now()
        const { card: after, log } = await rateCard(db, card.id, rating, {
          durationMs: time - shownAt.current,
          now: time,
        })
        const wasDue = log.kind === 'review'
        setSession(
          (s) =>
            s && releaseWaiting(afterRating(s, rating, after, wasDue), time),
        )
        setRevealed(false)
      } finally {
        busy.current = false
        setPending(false)
      }
    },
    [card, db],
  )

  /** Practice anyway: up to 50 cards, schedule unchanged. */
  const practice = useCallback(async () => {
    const cards = await getPracticeCards(db, scope)
    setRevealed(false)
    setTotal(cards.length)
    setSession(startSession(cards))
  }, [db, scope])

  return {
    session,
    card,
    face,
    preview,
    revealed,
    practising,
    left,
    total,
    now,
    waitingAt,
    failed,
    pending,
    reveal,
    rate: (rating: Rating) => runTask(rate(rating)),
    practice: () => runTask(practice()),
    retry: () => {
      setFailed(false)
      setAttempt((n) => n + 1)
    },
    setSession,
    setRevealed,
  }
}
