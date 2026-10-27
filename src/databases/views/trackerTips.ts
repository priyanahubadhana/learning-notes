import type { DbColumn } from '../../core/types'
import type { TipId } from '../../help/helpRegistry'
import type { LessonStatus } from '../trackerStats'

/** The tip that explains a status. */
export const statusTip = (status: LessonStatus): TipId =>
  `tracker.status.${status}`

/** The hover tip for a Study tracker column header (none for other columns). */
export function headerTip(column: DbColumn | null): TipId | undefined {
  if (column === null) return 'tracker.lesson'
  switch (column.type) {
    case 'trackerStatus':
      return 'tracker.status'
    case 'trackerLastRevised':
      return 'tracker.lastRevised'
    case 'trackerCardsDue':
      return 'tracker.cardsDue'
    case 'trackerCorrect':
      return 'tracker.correct'
    case 'trackerLevels':
      return 'tracker.levels'
    case 'number':
      return column.config.format === 'stars' ? 'tracker.confidence' : undefined
  }
  return undefined
}
