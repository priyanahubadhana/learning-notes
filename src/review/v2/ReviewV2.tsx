import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import type { ReviewScope } from '../../recall/reviewService'
import { Home } from './Home'
import { Session } from './Session'
import './reviewV2.css'

export interface ReviewV2Props {
  db: LearningNotesDB
  /** A scope from the address (deck, page, wrong...) opens its session at once; null = Home. */
  scope: ReviewScope | null
  /** True while the phone menu covers this screen: keys are for the menu. */
  keysPaused: boolean
  /** Opens the card's page and scrolls to the card. */
  onOpenNote: (pageId: string, blockId: string) => void
  /** Opens the highlight a card was made from. */
  onOpenAnnotation?: (annotationId: string) => void
  /** Closes the session that came from an address. */
  onClose: () => void
  onOpenNotebooks?: () => void
  /** Starts a session from Home with its own address, so Back returns to it. Without it the session stays inside this screen. */
  onStart?: (scope: ReviewScope) => void
}

/**
 * Review v2 (flag `review.v2`): Home, Session, Waiting and Done in one place.
 * A session started from Home lives here; one that came from an address
 * (`#/review/deck/<id>`, `#/review/wrong`...) is closed by the app as today.
 */
export function ReviewV2(props: ReviewV2Props) {
  const { db, scope, onClose } = props
  const [homeScope, setHomeScope] = useState<ReviewScope>({ kind: 'all' })
  const [local, setLocal] = useState<{
    scope: ReviewScope
    practice: boolean
  } | null>(null)

  const active = scope ? { scope, practice: false } : local
  const scopeName = useLiveQuery(async () => {
    const s = active?.scope
    if (!s) return undefined
    if (s.kind === 'page') return (await db.pages.get(s.pageId))?.title
    if (s.kind === 'notebook')
      return (await db.notebooks.get(s.notebookId))?.title
    if (s.kind === 'blocks') return s.name
    if (s.kind === 'deck') return (await db.decks.get(s.deckId))?.name
    return undefined
  }, [db, JSON.stringify(active?.scope)])

  if (!active) {
    return (
      <Home
        db={db}
        scope={homeScope}
        onScope={setHomeScope}
        onStart={(s) =>
          props.onStart
            ? props.onStart(s)
            : setLocal({ scope: s, practice: false })
        }
        onPractice={(s) => setLocal({ scope: s, practice: true })}
        onOpenNotebooks={props.onOpenNotebooks}
      />
    )
  }

  const s = active.scope
  const title =
    s.kind === 'wrong'
      ? t('review.titleWrong')
      : s.kind === 'all'
        ? t('review.title')
        : t(
            s.kind === 'notebook'
              ? 'review.titleNotebook'
              : s.kind === 'deck'
                ? 'review.titleDeck'
                : 'review.titlePage',
            { name: scopeName || t('review.untitled') },
          )
  return (
    <Session
      key={`${JSON.stringify(s)}:${active.practice}`}
      db={db}
      scope={s}
      title={title}
      showTitle={s.kind !== 'all'}
      startInPractice={active.practice}
      keysPaused={props.keysPaused}
      onOpenNote={props.onOpenNote}
      onOpenAnnotation={props.onOpenAnnotation}
      onClose={scope ? onClose : () => setLocal(null)}
    />
  )
}
