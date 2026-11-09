import { t } from '../i18n/t'
import type { UpdateRisk } from './autoUpdate'

/** Shown only when an update could lose data (automatic updates). */
export function UpdateRiskBar({
  risk,
  onUpdate,
  onClose,
}: {
  risk: UpdateRisk
  onUpdate: () => void
  onClose: () => void
}) {
  const button =
    '-my-1 min-h-9 shrink-0 rounded-md px-2.5 text-accent hover:bg-hover'
  const message =
    risk.kind === 'unsaved'
      ? t('update.risk.unsaved')
      : risk.reason === 'space'
        ? t('update.risk.space')
        : t('update.risk.backup')
  return (
    <div
      role="status"
      data-chrome
      className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface-3 px-3.5 py-2 text-[13px] text-ink shadow-[var(--elev-2)]"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onUpdate}
        className={`${button} font-semibold underline underline-offset-2`}
      >
        {t('update.risk.anyway')}
      </button>
      <button type="button" onClick={onClose} className={button}>
        {t('update.risk.later')}
      </button>
    </div>
  )
}
