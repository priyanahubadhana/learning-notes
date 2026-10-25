import { t } from '../i18n/t'
import { dueLabel, type CardStatus } from './cardList'

const STATUS_KEYS = {
  new: 'cardList.status.new',
  due: 'cardList.status.due',
  suspended: 'cardList.status.suspended',
} as const

export function CardStatusLabel({
  status,
  due,
  now,
}: {
  status: CardStatus
  due: number
  now: number
}) {
  return (
    <span
      className={`shrink-0 text-xs ${
        status === 'due' ? 'font-medium text-accent' : 'text-muted'
      }`}
    >
      {status === 'later' ? dueLabel(due, now) : t(STATUS_KEYS[status])}
    </span>
  )
}
