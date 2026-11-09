import { useEffect, useRef, useState, type ReactNode } from 'react'
import { HelpLine } from '../../help/Help'
import { t, type MessageKey } from '../../i18n/t'
import { usePopup } from '../popups'
import { PopupClose } from '../tools/PopupClose'
import {
  aloudState,
  listVoices,
  pauseAloud,
  resumeAloud,
  setAloudSpeed,
  setAloudVoice,
  setSleepTimer,
  sleepLeft,
  startAloud,
  stopAloud,
  voiceChoice,
  aloudSupported,
  nextPageAloud,
  skipAloud,
  skipMode,
  sleepAtEnd,
  SKIP_MODES,
} from './aloudController'
import { rankVoices } from './voices'
import { SLEEP_MINUTES, SPEEDS } from './readingPrefs'
import { speechAvailable } from './readAloud'
import { Icon } from '../tools/icons'

/** The Reading mode panels: look, read aloud, and outline with bookmarks. */

const msg = (key: string) => t(key as MessageKey)

export function Shell({
  name,
  title,
  onClose,
  children,
}: {
  name: string
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  // The shared pop-up rule: outside tap, Esc and one at a time.
  usePopup(true, onClose, (target) => ref.current?.contains(target) ?? false, {
    keepOnScroll: true,
  })
  useEffect(() => {
    ref.current
      ?.querySelector<HTMLElement>('button:enabled:not([data-popup-close])')
      ?.focus({ preventScroll: true })
  }, [])
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={title}
      data-testid={`reading-panel-${name}`}
      className="fixed inset-x-2 bottom-2 z-[90] max-h-[78vh] overflow-y-auto rounded-2xl border border-line bg-bg p-3 text-ink shadow-[0_12px_40px_rgba(0,0,0,0.25)] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[360px]"
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <PopupClose onClose={onClose} />
      </div>
      {children}
    </div>
  )
}

/** A row of choices where one is on (radio buttons). */
export function Choices<T extends string | number>({
  label,
  value,
  options,
  onPick,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string; swatch?: string }[]
  onPick: (v: T) => void
}) {
  return (
    <div className="mb-3">
      <div id={`rd-${label}`} className="mb-1 text-xs font-medium text-muted">
        {label}
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-1.5"
      >
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onPick(o.value)}
            className={`min-h-11 min-w-11 rounded-lg border px-3 text-sm ${
              o.value === value
                ? 'border-accent bg-hover font-semibold text-accent'
                : 'border-line text-ink hover:bg-hover'
            }`}
          >
            {o.swatch && (
              <span
                aria-hidden
                className="me-1.5 inline-block size-3 rounded-full border border-line align-middle"
                style={{ background: o.swatch }}
              />
            )}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Toggle({
  label,
  on,
  onChange,
}: {
  label: string
  on: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 text-left text-sm hover:bg-hover"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={`inline-block h-6 w-10 shrink-0 rounded-full p-0.5 transition-colors ${on ? 'bg-accent' : 'bg-line'}`}
      >
        <span
          className={`block size-5 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`}
        />
      </span>
    </button>
  )
}

export function AloudPanel({
  root,
  speed,
  title,
  pageId,
  onClose,
}: {
  root: HTMLElement | null
  speed: number
  title: string
  pageId: string
  onClose: () => void
}) {
  const state = aloudState.useValue()
  const left = sleepLeft.useValue()
  const voice = voiceChoice.useValue()
  const skip = skipMode.useValue()
  const atEnd = sleepAtEnd.useValue()
  const [voices, setVoices] = useState(listVoices)
  useEffect(() => {
    if (!speechAvailable()) return
    const synth = window.speechSynthesis
    const update = () => setVoices(rankVoices(synth.getVoices()))
    update()
    synth.addEventListener?.('voiceschanged', update)
    return () => synth.removeEventListener?.('voiceschanged', update)
  }, [])

  if (!aloudSupported()) {
    return (
      <Shell name="aloud" title={t('reading.panel.aloud')} onClose={onClose}>
        <p className="text-sm">{t('reading.aloud.unsupported')}</p>
      </Shell>
    )
  }
  const mins =
    left === null
      ? ''
      : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  return (
    <Shell name="aloud" title={t('reading.panel.aloud')} onClose={onClose}>
      <HelpLine id="reading.aloud" className="mb-2 text-xs text-muted" />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {state === 'playing' ? (
          <button type="button" onClick={pauseAloud} className={primary}>
            {t('reading.aloud.pause')}
          </button>
        ) : state === 'paused' ? (
          <button type="button" onClick={resumeAloud} className={primary}>
            {t('reading.aloud.resume')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => root && startAloud(root, 0, { title, pageId })}
            className={primary}
          >
            {t('reading.aloud.start')}
          </button>
        )}
        <button
          type="button"
          disabled={state === 'idle'}
          onClick={stopAloud}
          className={`${secondary} disabled:opacity-40`}
        >
          {t('reading.aloud.stop')}
        </button>
      </div>
      <div
        className="mb-3 flex flex-wrap gap-1.5"
        role="group"
        aria-label={t('reading.aloud.skip')}
      >
        <button
          type="button"
          disabled={state === 'idle'}
          aria-label={t('reading.aloud.back')}
          onClick={() => skipAloud(-1)}
          className={`${secondary} disabled:opacity-40`}
        >
          <Icon name="rewind" size={18} />
        </button>
        <button
          type="button"
          disabled={state === 'idle'}
          aria-label={t('reading.aloud.forward')}
          onClick={() => skipAloud(1)}
          className={`${secondary} disabled:opacity-40`}
        >
          <Icon name="fastForward" size={18} />
        </button>
        <button
          type="button"
          disabled={state === 'idle'}
          onClick={nextPageAloud}
          className={`${secondary} disabled:opacity-40`}
        >
          {t('reading.aloud.nextPage')}
        </button>
      </div>
      <Choices
        label={t('reading.aloud.skip')}
        value={skip}
        options={SKIP_MODES.map((value) => ({
          value,
          label: msg(`reading.aloud.skip.${value}`),
        }))}
        onPick={(v) => skipMode.set(v)}
      />
      <p
        role="status"
        className="mb-3 text-sm text-muted"
        data-testid="aloud-status"
      >
        {t(`reading.aloud.state.${state}` as MessageKey)}
      </p>
      <p className="mb-3 text-xs text-muted">{t('reading.aloud.tapHint')}</p>
      <Choices
        label={t('settings.reading.speed.label')}
        value={speed}
        options={SPEEDS.map((value) => ({
          value,
          label: msg(`reading.opt.speed.${value}`),
        }))}
        onPick={setAloudSpeed}
      />
      <div className="mb-3">
        <label
          className="mb-1 block text-xs font-medium text-muted"
          htmlFor="rd-voice"
        >
          {t('reading.aloud.voice')}
        </label>
        <select
          id="rd-voice"
          value={voice}
          onChange={(e) => setAloudVoice(e.target.value)}
          className="min-h-11 w-full rounded-lg border border-line bg-bg px-2 text-sm"
        >
          <option value="">{t('reading.aloud.voiceDefault')}</option>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">
          {t('reading.aloud.betterVoices')}
        </p>
      </div>
      <Choices
        label={t('reading.aloud.sleep')}
        value={left === null ? (atEnd ? -2 : 0) : -1}
        options={[
          { value: 0, label: t('reading.aloud.sleepOff') },
          { value: -2, label: t('reading.aloud.sleepEndOfPage') },
          ...SLEEP_MINUTES.map((m) => ({
            value: m as number,
            label: t('reading.aloud.sleepMinutes', { count: m }),
          })),
        ]}
        onPick={(v) => {
          sleepAtEnd.set(v === -2)
          setSleepTimer(v <= 0 ? null : v)
        }}
      />
      {left !== null && (
        <p className="text-sm" data-testid="sleep-left">
          {t('reading.aloud.sleepLeft', { time: mins })}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">{t('reading.aloud.continues')}</p>
    </Shell>
  )
}

const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90'
const secondary =
  'min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover'
