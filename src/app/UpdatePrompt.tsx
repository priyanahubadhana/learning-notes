import { useEffect, useMemo, useState } from 'react'
import { createToastQueue } from './overlay'
import { t } from '../i18n/t'
import { promptControls } from './autoUpdate'

/**
 * The 3-second "Restarting in N s" prompt (update.v2): one message in the
 * shared toast queue, with Cancel and Restart now (44 px, click and key,
 * Esc = Cancel). It stays until the countdown ends or it is answered.
 */
export default function UpdatePrompt({ seconds }: { seconds?: number }) {
  const queue = useMemo(() => createToastQueue({ max: 1, timeoutMs: 0 }), [])
  const [, bump] = useState(0)
  useEffect(() => queue.subscribe(() => bump((n) => n + 1)), [queue])
  const asking = seconds !== undefined
  useEffect(() => {
    if (!asking) return
    const id = queue.push({ message: t('update.prompt'), timeoutMs: 0 })
    return () => queue.dismiss(id)
  }, [asking, queue])
  useEffect(() => {
    if (!asking) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') promptControls.cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [asking])
  const item = queue.visible()[0]
  if (!asking || !item) return null
  return (
    <div
      data-chrome
      data-update-prompt
      role="alertdialog"
      aria-label={t('update.prompt', { s: seconds })}
      className="fixed bottom-16 left-1/2 z-50 w-[min(360px,calc(100vw-16px))] -translate-x-1/2 rounded-xl border border-line bg-surface-3 p-2 text-sm text-ink shadow-[var(--elev-2)] phone:bottom-20"
    >
      <div role="status" aria-live="polite" className="px-2 py-1">
        {t('update.prompt', { s: seconds })}
      </div>
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          data-update-cancel
          onClick={() => promptControls.cancel()}
          className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line px-3 hover:bg-hover"
        >
          {t('update.cancel')}
        </button>
        <button
          type="button"
          data-update-restart-now
          onClick={() => promptControls.restartNow()}
          className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line px-3 hover:bg-hover"
        >
          {t('upd.restartNow')}
        </button>
      </div>
    </div>
  )
}
