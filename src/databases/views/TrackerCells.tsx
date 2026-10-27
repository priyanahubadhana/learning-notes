import { t } from '../../i18n/t'
import { tagColorStyle } from '../../tags/tagStyle'
import {
  CARD_LEVELS,
  LESSON_STATUSES,
  levelMeaning,
  levelName,
  statusName,
  statusOptions,
  type CardLevel,
  type LessonStatus,
  type LessonStats,
  type TrackerRow,
} from '../trackerStats'
import { PopHeading, PopItem, PopSeparator, Popover } from './Popover'

/**
 * Study tracker cells that are more than text: the Status pill (📌 when
 * the user set it), the Status menu, the card level bar, and the text of
 * the Cards due cell.
 */

const COLORS = new Map(statusOptions().map((o) => [o.id, o.color]))

/** Status as a coloured pill; 📌 marks a status the user set. */
export function StatusPill({ row }: { row: TrackerRow }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`tag-chip ${COLORS.get(row.status) ? 'tag-chip-colored' : ''}`}
        style={tagColorStyle(COLORS.get(row.status))}
      >
        {statusName(row.status)}
      </span>
      {row.override && (
        <span
          role="img"
          aria-label={t('tracker.status.pinned')}
          title={t('tracker.status.pinned')}
        >
          📌
        </span>
      )}
    </span>
  )
}

/**
 * Status menu: "Auto (now: X)" hands the Status back to the app; the four
 * statuses set it by hand (📌).
 */
export function StatusPicker({
  row,
  anchor,
  onSet,
  onClose,
}: {
  row: TrackerRow
  anchor: HTMLElement
  onSet: (status: LessonStatus | null) => void
  onClose: () => void
}) {
  const pick = (status: LessonStatus | null) => {
    onSet(status)
    onClose()
  }
  return (
    <Popover
      anchor={anchor}
      label={t('tracker.column.status')}
      onClose={onClose}
    >
      <PopItem
        icon="⟲"
        on={row.override === null}
        label={t('tracker.status.auto', { status: statusName(row.auto) })}
        onClick={() => pick(null)}
      />
      <PopSeparator />
      <PopHeading>{t('tracker.status.setByYou')}</PopHeading>
      {LESSON_STATUSES.map((status) => (
        <PopItem
          key={status}
          icon={
            <span
              className="tag-dot"
              style={tagColorStyle(COLORS.get(status))}
            />
          }
          on={row.override === status}
          label={
            <span className="flex w-full items-center justify-between gap-2">
              {statusName(status)}
              <span aria-hidden>📌</span>
            </span>
          }
          onClick={() => pick(status)}
        />
      ))}
      <PopSeparator />
      <p className="px-2.5 py-1 text-xs text-muted">
        {t('tracker.status.rule')}
      </p>
    </Popover>
  )
}

/** Colours of the level bar, from lightest (New) to strongest (Mastered). */
const LEVEL_FILL: Record<CardLevel, string> = {
  new: 'bg-line',
  learning: 'bg-[#d9822b]',
  familiar: 'bg-[#2f6feb]',
  mastered: 'bg-[#2e9e6b]',
}

/** A bar split by card level, with the numbers beneath (hover/tap for meanings). */
export function LevelsCell({ stats }: { stats: LessonStats }) {
  if (stats.cards === 0) return null
  return (
    <div className="min-w-36">
      <div
        role="img"
        aria-label={CARD_LEVELS.filter((l) => stats.levels[l] > 0)
          .map((l) => `${stats.levels[l]} ${levelName(l)}`)
          .join(', ')}
        className="flex h-2 overflow-hidden rounded-full bg-line"
      >
        {CARD_LEVELS.map((level) =>
          stats.levels[level] > 0 ? (
            <span
              key={level}
              title={`${levelName(level)}: ${levelMeaning(level)}`}
              className={LEVEL_FILL[level]}
              style={{ width: `${(stats.levels[level] / stats.cards) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <div className="mt-1 text-xs text-muted">
        {CARD_LEVELS.filter((l) => stats.levels[l] > 0)
          .map((l) => `${stats.levels[l]} ${levelName(l)}`)
          .join(' · ')}
      </div>
    </div>
  )
}
