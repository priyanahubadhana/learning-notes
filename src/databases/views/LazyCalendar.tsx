import { lazy, Suspense } from 'react'
import { t } from '../../i18n/t'
import type { ViewProps } from './viewTypes'

const Calendar = lazy(() =>
  import('./CalendarView').then((m) => ({ default: m.CalendarView })),
)

/**
 * The Calendar view, loaded the first time one is opened (its month, week
 * and Year screens and drag code stay out of the first download).
 */
export function LazyCalendarView(props: ViewProps) {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted">{t('notebook.loading')}</p>}
    >
      <Calendar {...props} />
    </Suspense>
  )
}
