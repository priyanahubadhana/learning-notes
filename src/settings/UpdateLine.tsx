import { useEffect, useState } from 'react'
import { useFlag } from '../app/flags'
import { t } from '../i18n/t'
import { lastCheckedAt, onChecked, updateWaiting } from '../app/updates'
import { updateStatus } from '../app/updateStatus'

/**
 * U0a: one visible line on Settings' first page: which version runs and
 * whether it is up to date. Switch `update.versionLine` (ON on the preview
 * host only). It reads the same state as the pill; it changes nothing.
 */
export function UpdateLine() {
  const on = useFlag('update.versionLine')
  const [, tick] = useState(0)
  useEffect(() => onChecked(() => tick((n) => n + 1)), [])
  const { phase } = updateStatus.useValue()
  if (!on) return null
  const state =
    phase === 'updating'
      ? 'restarting'
      : phase === 'downloading' || phase === 'installing'
        ? 'downloading'
        : phase === 'checking'
          ? 'checking'
          : phase === 'ready' || updateWaiting()
            ? 'ready'
            : phase === 'failed'
              ? 'failed'
              : phase === 'offline'
                ? 'offline'
                : lastCheckedAt()
                  ? 'upToDate'
                  : 'notChecked'
  return (
    <p
      data-update-line
      data-update-state={state}
      data-update-commit={__APP_COMMIT__}
      className="mt-2 text-sm text-muted"
    >
      {t('upd.line.version', { commit: __APP_COMMIT__.slice(0, 7) })}
      {' · '}
      {t(`upd.line.${state}`)}
    </p>
  )
}
