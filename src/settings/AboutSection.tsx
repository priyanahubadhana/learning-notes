import { useEffect, useState } from 'react'
import { updateStatus } from '../app/updateStatus'
import { aboutReady, type AboutReady } from './aboutReady'
import {
  checkForUpdateNow,
  lastCheckedAt,
  onChecked,
  onUpdateOffer,
  updateDismissed,
  updateWaiting,
  applyWaitingUpdate,
} from '../app/updates'
import { pressRestart } from '../app/restartNow'
import { t, type MessageKey } from '../i18n/t'
import { useFlag } from '../app/flags'
import { UPDATE_LEVEL } from '../app/updateLevel'
import { useUnlocked } from './level'
import { autoUpdateSetting } from './builtinSettings'
import { useDeviceSetting } from './useSetting'

const READY_KEY: Record<AboutReady, MessageKey> = {
  updating: 'about.readyAuto',
  auto: 'about.readyWait',
  closed: 'about.readyClosed',
  notice: 'about.ready',
}

/** Settings › About this app: which version runs, and a way to look for a new one. */
export function AboutSection() {
  const [status, setStatus] = useState<
    'idle' | 'checking' | 'ready' | 'current' | 'failed'
  >(updateWaiting() ? 'ready' : 'idle')
  const [, tick] = useState(0)
  // A version found while this screen is open shows at once.
  useEffect(
    () =>
      onUpdateOffer(() => setStatus((s) => (s === 'checking' ? s : 'ready'))),
    [],
  )
  const [auto] = useDeviceSetting(autoUpdateSetting)
  const { phase, restart } = updateStatus.useValue()
  const ready = aboutReady({
    auto: auto === 'on',
    phase,
    dismissed: updateDismissed(),
  })
  useEffect(() => onChecked(() => tick((n) => n + 1)), [])
  // update.v2: version, level and last check are Professional (about.version).
  const v2 = useFlag('update.v2')
  const details = useUnlocked('about.version') || !v2
  // U0a: with the version line on Settings' first page, the version shows there only.
  const oneLine = useFlag('update.versionLine')
  const at = lastCheckedAt()
  const built = new Date(__APP_BUILT__)
  return (
    <section
      aria-labelledby="about-title"
      data-about
      className="mb-6 rounded-lg border border-line p-4 text-sm leading-relaxed"
    >
      <h2 id="about-title" className="mb-1 font-semibold">
        {t('about.title')}
      </h2>
      {details && !oneLine && (
        <p>
          {t('about.version', {
            commit: __APP_COMMIT__.slice(0, 7),
            date: built.toLocaleDateString(),
          })}
        </p>
      )}
      {v2 && details && (
        <p className="text-muted" data-about-level>
          {t('about.v2.level', { level: UPDATE_LEVEL })}
        </p>
      )}
      {details && (
        <p className="text-muted" data-about-last>
          {at
            ? t('about.lastChecked', {
                time: new Date(at).toLocaleTimeString(),
              })
            : t('about.neverChecked')}
        </p>
      )}
      <p role="status" data-about-status>
        {status === 'checking' && t('about.checking')}
        {status === 'ready' && t(READY_KEY[ready])}
        {status === 'current' && t('about.current')}
        {status === 'failed' && t('about.failed')}
      </p>
      {phase === 'updating' && restart && (
        <button
          type="button"
          data-about-restart
          onClick={pressRestart}
          className="mr-2 mt-3 min-h-11 rounded-lg border border-line px-3 hover:bg-hover"
        >
          {restart === 'failed' ? t('upd.restartFailed') : t('upd.restartNow')}
        </button>
      )}
      {status === 'ready' && (ready === 'auto' || ready === 'closed') && (
        <button
          type="button"
          data-about-update
          onClick={() => applyWaitingUpdate()}
          className="mr-2 mt-3 min-h-11 rounded-lg border border-line px-3 hover:bg-hover"
        >
          {t('about.updateNow')}
        </button>
      )}
      <button
        type="button"
        disabled={status === 'checking'}
        onClick={() => {
          setStatus('checking')
          updateStatus.set({ phase: 'checking' })
          void checkForUpdateNow().then((r) => {
            setStatus(r)
            if (r === 'current') updateStatus.set({ phase: 'current' })
            else if (r === 'failed')
              updateStatus.set({
                phase: navigator.onLine ? 'failed' : 'offline',
              })
            else if (updateStatus.get().phase === 'checking')
              updateStatus.set({ phase: 'ready' })
          })
        }}
        className="mt-3 min-h-11 rounded-lg border border-line px-3 hover:bg-hover"
      >
        {t('about.check')}
      </button>
      {v2 && (
        <button
          type="button"
          data-about-pretend
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('learning-notes:test-required-update', {
                detail: { real: true },
              }),
            )
          }
          className="ml-3 mt-3 min-h-11 rounded-lg border border-line px-3 hover:bg-hover"
        >
          {t('about.v2.pretend')}
        </button>
      )}
    </section>
  )
}
