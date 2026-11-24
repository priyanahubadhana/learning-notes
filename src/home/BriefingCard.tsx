import { t } from '../i18n/t'
import type { Briefing } from './briefing'
import { Icon } from '../app/tools/icons'

/**
 * The Briefing (F3), at the top of Home: short lines about today, nothing
 * to read. Yesterday's missed habits show as a red cross.
 */
export function BriefingCard({
  briefing,
  onOpenCards,
  bare,
}: {
  briefing: Briefing
  onOpenCards?: () => void
  /** Inside a Home v2 widget: the widget draws the frame and the title. */
  bare?: boolean
}) {
  const top3Left = briefing.top3.filter((m) => m.mark !== 'done').length
  const lines: { key: string; text: string }[] = [
    {
      key: 'top3',
      text: t('home.brief.top3', {
        left: top3Left,
        total: briefing.top3.length,
      }),
    },
    {
      key: 'due',
      text: t('home.brief.due', { count: briefing.dueToday.length }),
    },
    {
      key: 'habits',
      text: t('home.brief.habits', { count: briefing.habitsLeft.length }),
    },
    {
      key: 'carried',
      text: t('home.brief.carried', {
        count: briefing.carriedFromYesterday.length,
      }),
    },
  ]
  return (
    <section
      aria-label={t('home.brief.title')}
      data-testid="briefing"
      className={bare ? '' : 'rounded-xl border border-line p-3'}
    >
      {!bare && (
        <h3 className="mb-2 text-sm font-semibold">{t('home.brief.title')}</h3>
      )}
      <ul className="flex flex-col gap-1 text-sm">
        {lines.map((l) => (
          <li key={l.key} data-testid={`brief-${l.key}`}>
            {l.text}
          </li>
        ))}
        <li data-testid="brief-cards">
          {onOpenCards && briefing.cardsDue > 0 ? (
            <button
              type="button"
              onClick={onOpenCards}
              className="min-h-11 text-start underline underline-offset-2"
            >
              {t('home.brief.cards', { count: briefing.cardsDue })}
            </button>
          ) : (
            t('home.brief.cards', { count: briefing.cardsDue })
          )}
        </li>
        {briefing.missedHabits.map((h) => (
          <li
            key={h.id}
            data-testid="brief-missed"
            className="flex items-center gap-2"
          >
            <span aria-hidden className="font-bold text-danger">
              <Icon name="close" size={18} />
            </span>
            <span>{t('home.brief.missed', { name: h.name })}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
