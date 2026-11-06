import { t } from '../../i18n/t'
import { dateKey, shortDayLabel } from '../../journal/dates'

/**
 * The Home and Library spaces until their steps are built (Library: step 5,
 * Home: step 7). Home links to today's journal; Library has an Import button
 * that does nothing yet.
 */
export function SpacePlaceholder({
  space,
  onOpenToday,
  compact = false,
}: {
  space: 'home' | 'library'
  onOpenToday?: () => void
  compact?: boolean
}) {
  return (
    <section
      aria-label={t(`space.${space}.title`)}
      className={compact ? 'px-1.5 py-2' : 'mx-auto mt-[18vh] max-w-sm px-6'}
    >
      <h2
        className={
          compact
            ? 'mb-1 text-[11px] tracking-[0.06em] text-muted uppercase'
            : 'mb-2 text-xl font-semibold'
        }
      >
        {t(`space.${space}.title`)}
      </h2>
      <p className="mb-3 text-sm leading-relaxed text-muted">
        {t(`space.${space}.soon`)}
      </p>
      {space === 'home' ? (
        <button
          type="button"
          onClick={onOpenToday}
          className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-left text-sm hover:border-accent"
        >
          ☀{' '}
          {t('space.home.today', {
            date: shortDayLabel(dateKey(new Date())),
          })}
        </button>
      ) : (
        <button
          type="button"
          disabled
          title={t('space.library.importSoon')}
          className="min-h-11 w-full rounded-lg border border-line px-3 text-sm text-muted opacity-70"
        >
          {t('space.library.import')}
        </button>
      )}
    </section>
  )
}
