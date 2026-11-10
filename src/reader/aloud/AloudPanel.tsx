import { useEffect, useState } from 'react'
import { SPEEDS } from '../../app/reading/readingPrefs'
import { listVoices, voiceChoice } from '../../app/reading/aloudController'
import { readingSpeedSetting } from '../../settings/readingSettings'
import { useDeviceSetting } from '../../settings/useSetting'
import { t } from '../../i18n/t'
import {
  bookAloudAvailable,
  bookAloudState,
  pauseBookAloud,
  resumeBookAloud,
  setBookAloudSpeed,
  setBookAloudVoice,
  skipBookAloud,
  startBookAloud,
  stopBookAloud,
} from './bookAloud'

const btn =
  'min-h-11 min-w-11 rounded-lg border border-line px-3 text-sm hover:bg-hover'

/**
 * The Audio tab's Read aloud for an open book: play and pause, back and
 * forward by a sentence, speed and the device voice. The page follows the
 * voice and the sentence being read is marked.
 */
export default function AloudPanel() {
  const state = bookAloudState.useValue()
  const [speed] = useDeviceSetting(readingSpeedSetting)
  const voice = voiceChoice.useValue()
  const [voices, setVoices] = useState(() => listVoices())
  useEffect(() => {
    if (!bookAloudAvailable()) return
    const refresh = () => setVoices(listVoices())
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh)
    return () =>
      window.speechSynthesis.removeEventListener?.('voiceschanged', refresh)
  }, [])
  if (!bookAloudAvailable()) {
    return (
      <p className="mb-3 text-sm text-muted" data-testid="aloud-unsupported">
        {t('reader.aloud.unsupported')}
      </p>
    )
  }
  return (
    <section
      data-chrome
      data-testid="book-aloud"
      aria-label={t('reader.aloud.label')}
      className="mb-3 rounded-lg border border-line p-2"
    >
      <h3 className="mb-1 text-sm font-semibold">{t('reader.aloud.label')}</h3>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btn}
          aria-label={t('reader.aloud.back')}
          disabled={state === 'idle'}
          onClick={() => skipBookAloud(-1)}
        >
          ⏮
        </button>
        <button
          type="button"
          data-testid="aloud-play"
          aria-pressed={state === 'playing'}
          className={`${btn} flex-1 font-semibold`}
          onClick={() =>
            state === 'playing'
              ? pauseBookAloud()
              : state === 'paused'
                ? resumeBookAloud()
                : void startBookAloud()
          }
        >
          {state === 'playing'
            ? t('reader.aloud.pause')
            : state === 'paused'
              ? t('reader.aloud.resume')
              : t('reader.aloud.play')}
        </button>
        <button
          type="button"
          className={btn}
          aria-label={t('reader.aloud.forward')}
          disabled={state === 'idle'}
          onClick={() => skipBookAloud(1)}
        >
          ⏭
        </button>
        <button
          type="button"
          className={btn}
          aria-label={t('reader.aloud.stop')}
          disabled={state === 'idle'}
          onClick={stopBookAloud}
        >
          ■
        </button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <span className="shrink-0">{t('reader.aloud.speed')}</span>
        <select
          data-testid="aloud-speed"
          value={speed}
          onChange={(e) => setBookAloudSpeed(Number(e.target.value))}
          className="min-h-11 flex-1 rounded-lg border border-line bg-bg px-2"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s / 100}×
            </option>
          ))}
        </select>
      </label>
      {voices.length > 0 && (
        <label className="mt-2 flex items-center gap-2 text-sm">
          <span className="shrink-0">{t('reader.aloud.voice')}</span>
          <select
            value={voice}
            onChange={(e) => setBookAloudVoice(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-2"
          >
            <option value="">{t('reader.aloud.voiceDefault')}</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="mt-2 text-xs text-muted">{t('reader.aloud.note')}</p>
    </section>
  )
}
