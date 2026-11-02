import { t } from '../i18n/t'

/**
 * Offers a new version of the app. Separate from toasts: ordinary messages
 * do not replace it, and it never replaces an Undo.
 */
export function UpdateBar({
  onUpdate,
  onClose,
}: {
  onUpdate: () => void
  onClose: () => void
}) {
  const button =
    '-my-1 min-h-9 shrink-0 rounded-md px-2.5 text-bg hover:bg-bg/15'
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-[10px] bg-ink px-3.5 py-2 text-[13px] text-bg shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
    >
      <span>{t('update.ready')}</span>
      <button
        type="button"
        onClick={onUpdate}
        className={`${button} font-semibold underline underline-offset-2`}
      >
        {t('update.now')}
      </button>
      <button
        type="button"
        aria-label={t('history.close')}
        onClick={onClose}
        className={button}
      >
        ×
      </button>
    </div>
  )
}
