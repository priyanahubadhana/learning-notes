import { t } from '../../i18n/t'

/** "10 min" while in short steps (no day gap yet), "3 days" otherwise. */
export function intervalLabel(
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
export function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return t('interval.countdown', {
    m: Math.floor(total / 60),
    s: String(total % 60).padStart(2, '0'),
  })
}
