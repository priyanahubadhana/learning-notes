import { useSyncExternalStore } from 'react'
import { t } from '../i18n/t'
import { hasUnsaved, onUnsavedChange, retryUnsaved } from './saveStatus'

/**
 * Stays on screen while something could not be saved. It is not a toast, so
 * nothing replaces it and it does not close by itself.
 */
export function SaveNotice() {
  const show = useSyncExternalStore(onUnsavedChange, hasUnsaved)
  if (!show) return null
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] bg-danger px-3.5 py-2 text-[13px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
    >
      <span>{t('save.failed')}</span>
      <button
        type="button"
        onClick={retryUnsaved}
        className="-my-1 min-h-9 shrink-0 rounded-md px-2.5 font-semibold underline underline-offset-2 hover:bg-white/15"
      >
        {t('save.retry')}
      </button>
    </div>
  )
}
