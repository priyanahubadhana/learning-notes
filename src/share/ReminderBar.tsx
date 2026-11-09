import { centreEl } from '../app/centreEl'
import { t } from '../i18n/t'

/**
 * A gentle bar at the bottom: no backup file for a week. "Save backup now"
 * opens Save & restore; "Remind me later" asks again tomorrow.
 */
export function BackupReminder({
  onSave,
  onLater,
}: {
  onSave: () => void
  onLater: () => void
}) {
  const button =
    'min-h-9 shrink-0 rounded-md px-2.5 font-semibold underline underline-offset-2 hover:bg-bg/15'
  return (
    <div
      ref={centreEl}
      role="region"
      aria-label={t('backup.reminder.label')}
      className="fixed bottom-5 left-1/2 z-30 flex max-w-[calc(100vw-32px)] flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] bg-ink px-3.5 py-2 text-[13px] text-bg shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
    >
      <span>{t('backup.reminder.text')}</span>
      <button type="button" onClick={onSave} className={button}>
        {t('backup.reminder.save')}
      </button>
      <button type="button" onClick={onLater} className={button}>
        {t('backup.reminder.later')}
      </button>
    </div>
  )
}
