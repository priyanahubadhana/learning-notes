import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { countDue } from '../../recall/reviewLazy'

/** Cards due now, for the Review badge (0 while loading; updates live). */
export function useDue(db: LearningNotesDB): number {
  return useLiveQuery(() => countDue(db, Date.now()), [db], 0) ?? 0
}

/** "17" up to 99, then "99+": the badge must stay small. */
export const badgeText = (n: number): string => (n > 99 ? '99+' : String(n))

/** What a screen reader says for the Review badge: "17 cards due". */
export const dueLabel = (n: number): string => t('shell.due', { count: n })
