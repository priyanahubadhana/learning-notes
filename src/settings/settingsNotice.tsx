import { useSyncExternalStore } from 'react'
import { t } from '../i18n/t'
import {
  dismissSettingsNotice,
  noticeState,
  subscribeNotice,
  undoSettingsNotice,
} from './settingsNoticeState'

/** The quiet notice after settings start to follow you (state: settingsNoticeState.ts). */
export function SettingsNotice() {
  const s = useSyncExternalStore(subscribeNotice, noticeState)
  if (s.changes.length === 0) return null
  const button =
    '-my-1 min-h-9 shrink-0 rounded-md px-2.5 text-accent hover:bg-hover'
  return (
    <div
      role="status"
      data-chrome
      data-testid="settings-notice"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface-3 px-3.5 py-2 text-[13px] text-ink shadow-[var(--elev-2)]"
    >
      <span>{t('settingsNotice.text', { n: s.changes.length })}</span>
      <button
        type="button"
        onClick={undoSettingsNotice}
        className={`${button} font-semibold underline underline-offset-2`}
      >
        {t('settingsNotice.undo')}
      </button>
      <button type="button" onClick={dismissSettingsNotice} className={button}>
        {t('settingsNotice.ok')}
      </button>
    </div>
  )
}
