import { useEffect, useState } from 'react'
import { useFlag } from '../app/flags'
import { t } from '../i18n/t'
import {
  applyWaitingUpdate,
  checkForUpdateNow,
  lastCheckedAt,
  onChecked,
  updateWaiting,
} from '../app/updates'
import { updateStatus } from '../app/updateStatus'

type State =
  | 'restarting'
  | 'downloading'
  | 'checking'
  | 'ready'
  | 'failed'
  | 'offline'
  | 'upToDate'
  | 'notChecked'

/** Which words the card shows, from the same state the pill reads. */
function stateOf(phase: string): State {
  return phase === 'updating'
    ? 'restarting'
    : phase === 'postponed'
      ? 'ready'
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
}

/**
 * U0a: one visible line on Settings' first page: which version runs and
 * whether it is up to date (switch `update.versionLine`). U0c / S0: with
 * `update.v2` the line grows into the Update card (v5 card style, UP-07):
 * version once, the state, last check, Check now, and Update when one waits.
 * It reads the same state as the pill; it changes no stored data.
 */
export function UpdateLine() {
  const line = useFlag('update.versionLine')
  const v2 = useFlag('update.v2')
  const [, tick] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => onChecked(() => tick((n) => n + 1)), [])
  const { phase } = updateStatus.useValue()
  if (!line && !v2) return null
  const state = stateOf(phase)
  const common = {
    'data-update-line': '',
    'data-update-state': state,
    'data-update-commit': __APP_COMMIT__,
  }
  if (!v2)
    return (
      <p {...common} className="mt-2 text-sm text-muted">
        {t('upd.line.version', { commit: __APP_COMMIT__.slice(0, 7) })}
        {' · '}
        {t(`upd.line.${state}`)}
      </p>
    )
  const at = lastCheckedAt()
  const check = () => {
    setBusy(true)
    updateStatus.set({ phase: 'checking' })
    void checkForUpdateNow()
      .then((r) => {
        if (r === 'current') updateStatus.set({ phase: 'current' })
        else if (r === 'failed')
          updateStatus.set({ phase: navigator.onLine ? 'failed' : 'offline' })
        else if (updateStatus.get().phase === 'checking')
          updateStatus.set({ phase: 'ready' })
      })
      .finally(() => setBusy(false))
  }
  const btn =
    'flex min-h-11 items-center justify-center rounded-lg border border-line px-3 text-[14px] hover:bg-hover disabled:opacity-60'
  return (
    <section
      {...common}
      data-update-card
      aria-label={t('update.card.title')}
      className="mt-4 overflow-hidden rounded-[var(--r-lg)] border border-line bg-surface-0"
    >
      <div className="flex min-h-16 flex-wrap items-center gap-3.5 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">
            {t('update.card.title')}
          </div>
          <div className="mt-px text-[13px] text-muted">
            {t('upd.line.version', { commit: __APP_COMMIT__.slice(0, 7) })}
            {' · '}
            {t(`upd.line.${state}`)}
          </div>
          {at && (
            <div className="text-[13px] text-muted" data-update-last>
              {t('about.lastChecked', {
                time: new Date(at).toLocaleTimeString(),
              })}
            </div>
          )}
        </div>
        <div className="flex flex-none gap-2">
          {state === 'ready' && (
            <button
              type="button"
              data-update-card-update
              onClick={() => applyWaitingUpdate()}
              className={`${btn} bg-accent text-white`}
            >
              {t('update.card.update')}
            </button>
          )}
          <button
            type="button"
            data-update-card-check
            disabled={busy || state === 'checking'}
            onClick={check}
            className={btn}
          >
            {t('update.card.check')}
          </button>
        </div>
      </div>
    </section>
  )
}
