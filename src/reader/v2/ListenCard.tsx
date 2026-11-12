import { useContext, useEffect, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { SPEEDS } from '../../app/reading/readingPrefs'
import { speechAvailable } from '../../app/reading/readAloud'
import { voiceChoice } from '../../app/reading/aloudController'
import { Icon } from '../../app/tools/icons'
import { Card } from '../../design/parts/Card'
import { CardGroup, CardWell } from '../../design/parts/CardParts'
import { t, type MessageKey } from '../../i18n/t'
import { readingSpeedSetting } from '../../settings/readingSettings'
import { useUnlocked } from '../../settings/level'
import { useDeviceSetting } from '../../settings/useSetting'
import {
  bookAloudState,
  setBookAloudSpeed,
  setBookAloudVoice,
  skipBookAloud,
  stopBookAloud,
} from '../aloud/bookAloud'
import {
  SLEEP_CHOICES,
  setListenSleep,
  sleepChoice,
  toggleListen,
  type SleepChoice,
} from './listen'
import {
  groupVoices,
  pinsFor,
  togglePin,
  voicePins,
  type ListenVoice,
} from './voices'

type Rect = { left: number; top: number; width: number; height: number }

const sleepLabel = (c: SleepChoice) =>
  c === 'off'
    ? t('reading.aloud.sleepOff')
    : c === 'page'
      ? t('reading.aloud.sleepEndOfPage')
      : t('reading.aloud.sleepMinutes', { count: c })

/**
 * The Listen card (slice 7b, RD-B11/B44): opened by a hold on Listen. Nothing
 * plays until Play is pressed here. Play, Stop and the voice list are always
 * there; speed, sentence skip and the sleep timer each have their Professional
 * switch (reader.aloudVoice, reader.aloudSkip, reader.sleepTimer).
 */
export default function ListenCard({
  anchor,
  maxHeight,
  onClose,
}: {
  anchor: Rect
  maxHeight?: number
  onClose: () => void
}) {
  const { toast } = useContext(AppUiContext)
  const state = bookAloudState.useValue()
  const voice = voiceChoice.useValue()
  const pins = voicePins.useValue()
  const sleep = sleepChoice.useValue()
  const [speed] = useDeviceSetting(readingSpeedSetting)
  const speedOn = useUnlocked('reader.aloudVoice')
  const skipOn = useUnlocked('reader.aloudSkip')
  const sleepOn = useUnlocked('reader.sleepTimer')
  const lang = document.documentElement.lang || 'en'
  const [voices, setVoices] = useState<ListenVoice[]>(() =>
    speechAvailable() ? window.speechSynthesis.getVoices() : [],
  )
  useEffect(() => {
    if (!speechAvailable()) return
    const s = window.speechSynthesis
    const refresh = () => setVoices(s.getVoices())
    refresh()
    s.addEventListener?.('voiceschanged', refresh)
    return () => s.removeEventListener?.('voiceschanged', refresh)
  }, [])

  const myPins = pinsFor(pins, lang)
  const groups = groupVoices(voices, lang, myPins)

  const pick = (v: ListenVoice) => {
    const before = voiceChoice.get()
    setBookAloudVoice(v.voiceURI)
    toast(t('readerv2.listen.voiceSet', { name: v.name }), {
      label: t('annot.undo'),
      onSelect: () => setBookAloudVoice(before),
    })
  }
  const pin = (v: ListenVoice) => {
    const before = voicePins.get()
    const on = !pinsFor(before, lang).includes(v.voiceURI)
    voicePins.set(togglePin(before, lang, v.voiceURI))
    toast(
      t(on ? 'readerv2.listen.pinned' : 'readerv2.listen.unpinned', {
        name: v.name,
      }),
      { label: t('annot.undo'), onSelect: () => voicePins.set(before) },
    )
  }
  const setSpeed = (percent: number) => {
    const before = speed
    setBookAloudSpeed(percent)
    toast(t('readerv2.listen.speedSet', { speed: percent / 100 }), {
      label: t('annot.undo'),
      onSelect: () => setBookAloudSpeed(before),
    })
  }

  const playLabel =
    state === 'playing'
      ? t('reader.aloud.pause')
      : state === 'paused'
        ? t('reader.aloud.resume')
        : t('reader.aloud.play')

  return (
    <Card
      anchor={anchor}
      size="panel"
      title={t('readerv2.listen.title')}
      onClose={onClose}
      testId="rv2-listen-card"
    >
      <div
        className="rv2-card-scroll"
        style={maxHeight ? { maxHeight } : undefined}
      >
        {!speechAvailable() ? (
          <p className="pcard-note" data-testid="rv2-listen-unsupported">
            {t('reader.aloud.unsupported')}
          </p>
        ) : (
          <>
            <CardGroup>
              <CardWell>
                <div className="rv2-listen-controls">
                  {skipOn && (
                    <button
                      type="button"
                      className="rv2-listen-btn"
                      data-testid="rv2-listen-back"
                      aria-label={t('reader.aloud.back')}
                      disabled={state === 'idle'}
                      onClick={() => skipBookAloud(-1)}
                    >
                      <Icon name="chevronLeft" size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="rv2-listen-btn rv2-listen-btn--main"
                    data-testid="rv2-listen-play"
                    aria-pressed={state === 'playing'}
                    onClick={toggleListen}
                  >
                    {playLabel}
                  </button>
                  {skipOn && (
                    <button
                      type="button"
                      className="rv2-listen-btn"
                      data-testid="rv2-listen-fwd"
                      aria-label={t('reader.aloud.forward')}
                      disabled={state === 'idle'}
                      onClick={() => skipBookAloud(1)}
                    >
                      <Icon name="chevronRight" size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="rv2-listen-btn"
                    data-testid="rv2-listen-stop"
                    aria-label={t('reader.aloud.stop')}
                    disabled={state === 'idle'}
                    onClick={() => {
                      stopBookAloud()
                      setListenSleep('off')
                      toast(t('readerv2.listen.stopped'))
                    }}
                  >
                    ⏹
                  </button>
                </div>
              </CardWell>
            </CardGroup>
            {speedOn && (
              <CardGroup label={t('reader.aloud.speed')}>
                <CardWell>
                  <label className="rv2-listen-field">
                    <span className="sr-only">{t('reader.aloud.speed')}</span>
                    <select
                      data-testid="rv2-listen-speed"
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                    >
                      {SPEEDS.map((s) => (
                        <option key={s} value={s}>
                          {s / 100}×
                        </option>
                      ))}
                    </select>
                  </label>
                </CardWell>
              </CardGroup>
            )}
            {sleepOn && (
              <CardGroup label={t('reading.aloud.sleep')}>
                <CardWell>
                  <label className="rv2-listen-field">
                    <span className="sr-only">{t('reading.aloud.sleep')}</span>
                    <select
                      data-testid="rv2-listen-sleep"
                      value={String(sleep)}
                      onChange={(e) => {
                        const c: SleepChoice =
                          SLEEP_CHOICES.find(
                            (x) => String(x) === e.target.value,
                          ) ?? 'off'
                        setListenSleep(c)
                        toast(
                          t('readerv2.listen.sleepSet', {
                            when: sleepLabel(c),
                          }),
                        )
                      }}
                    >
                      {SLEEP_CHOICES.map((c) => (
                        <option key={String(c)} value={String(c)}>
                          {sleepLabel(c)}
                        </option>
                      ))}
                    </select>
                  </label>
                </CardWell>
              </CardGroup>
            )}
            {groups.length === 0 ? (
              <p className="pcard-note" data-testid="rv2-listen-novoice">
                {t('readerv2.listen.noVoices')}
              </p>
            ) : (
              groups.map((g) => (
                <CardGroup
                  key={g.id}
                  label={t(`readerv2.listen.group.${g.id}` as MessageKey)}
                >
                  <CardWell testId={`rv2-voices-${g.id}`}>
                    {g.voices.map((v) => {
                      const pinned = myPins.includes(v.voiceURI)
                      return (
                        <div key={v.voiceURI} className="rv2-voice">
                          <button
                            type="button"
                            className="pcard-row rv2-voice__pick"
                            data-testid="rv2-voice"
                            data-voice={v.voiceURI}
                            aria-pressed={voice === v.voiceURI}
                            onClick={() => pick(v)}
                          >
                            <span>
                              {v.name} ({v.lang})
                            </span>
                            {voice === v.voiceURI && (
                              <Icon name="check" size={18} />
                            )}
                          </button>
                          <button
                            type="button"
                            className="rv2-voice__pin"
                            data-testid="rv2-voice-pin"
                            data-voice={v.voiceURI}
                            aria-pressed={pinned}
                            aria-label={t(
                              pinned
                                ? 'readerv2.listen.unpin'
                                : 'readerv2.listen.pin',
                              { name: v.name },
                            )}
                            onClick={() => pin(v)}
                          >
                            <Icon name="star" size={18} />
                          </button>
                        </div>
                      )
                    })}
                  </CardWell>
                </CardGroup>
              ))
            )}
            <p className="pcard-note">{t('readerv2.listen.deviceOnly')}</p>
          </>
        )}
      </div>
    </Card>
  )
}
