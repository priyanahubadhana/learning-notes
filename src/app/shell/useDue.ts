import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { countDue } from '../../recall/reviewLazy'

/** Cards due now, for the Review badge (0 while loading; updates live). */
export function useDue(db: LearningNotesDB): number {
  return (
    useLiveQuery(
      async () => {
        // Why: countDue loads the review code with a dynamic import, and a live
        // query only learns which tables it reads while it runs in the same
        // tick. Without these two reads the badge read 0 once and never
        // changed (found by the RV-B10 test). Touch the tables here first.
        await Promise.all([db.cards.count(), db.reviewLogs.count()])
        return countDue(db, Date.now())
      },
      [db],
      0,
    ) ?? 0
  )
}

/** "17" up to 99, then "99+": the badge must stay small. */
export const badgeText = (n: number): string => (n > 99 ? '99+' : String(n))

/** What a screen reader says for the Review badge: "17 cards due". */
export const dueLabel = (n: number): string => t('shell.due', { count: n })
