import { useEffect, useRef, useState, type ReactNode } from 'react'
import { HelpLine } from '../../help/Help'
import { t, type MessageKey } from '../../i18n/t'
import { usePopup } from '../popups'
import { PopupClose } from '../tools/PopupClose'
import { pageHeadings } from './readingOutline'
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
} from './aloudController'
import {
  addBookmark,
  getBookmarks,
  removeBookmark,
  streakDays,
  type Bookmark,
} from './readingMarks'
import {
  BLANK_MODES,
  FLOWS,
  FONT_STACKS,
  LINE_SPACINGS,
  MARGINS,
  READING_FONTS,
  READING_THEMES,
  RULERS,
  SLEEP_MINUTES,
  SPEEDS,
  TEXT_SIZES,
  THEME_COLORS,
  WIDTHS,
} from './readingPrefs'
import type { ReadingSettings } from './useReadingSettings'
import type { ReadingPosition } from './useReadingPosition'
import { readingLocked } from './readingState'
import { speechAvailable } from './readAloud'

/** The Reading mode panels: look, read aloud, and outline with bookmarks. */

const msg = (key: string) => t(key as MessageKey)

function Shell({
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
function Choices<T extends string | number>({
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

export function SettingsPanel({
  s,
  flags,
  onReadFirst,
  onClose,
}: {
  s: ReadingSettings
  flags: { page: boolean; notebook: boolean }
  onReadFirst: (kind: 'page' | 'notebook', on: boolean) => void
  onClose: () => void
}) {
  const opt = <T extends string | number>(id: string, values: readonly T[]) =>
    values.map((value) => ({ value, label: msg(`reading.opt.${id}.${value}`) }))
  const locked = readingLocked.useValue()
  const streak = streakDays()
  return (
    <Shell name="settings" title={t('reading.panel.look')} onClose={onClose}>
      <Choices
        label={t('settings.reading.theme.label')}
        value={s.theme}
        options={READING_THEMES.map((value) => ({
          value,
          label: msg(`reading.opt.theme.${value}`),
          swatch: value === 'app' ? undefined : THEME_COLORS[value].bg,
        }))}
        onPick={s.set.theme}
      />
      <Choices
        label={t('settings.reading.font.label')}
        value={s.font}
        options={READING_FONTS.map((value) => ({
          value,
          label: msg(`reading.opt.font.${value}`),
        }))}
        onPick={s.set.font}
      />
      {s.font !== 'app' && (
        <p
          className="-mt-1 mb-3 text-sm text-muted"
          style={{ fontFamily: FONT_STACKS[s.font] }}
        >
          {t('reading.fontSample')}
        </p>
      )}
      <div className="mb-3">
        <div className="mb-1 text-xs font-medium text-muted">
          {t('settings.reading.size.label')}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t('reading.smaller')}
            disabled={s.size <= TEXT_SIZES[0]}
            onClick={() => {
              const i = TEXT_SIZES.indexOf(
                s.size as (typeof TEXT_SIZES)[number],
              )
              s.set.size(TEXT_SIZES[Math.max(0, i - 1)])
            }}
            className="min-h-11 min-w-11 rounded-lg border border-line text-lg hover:bg-hover disabled:opacity-40"
          >
            A−
          </button>
          <span
            className="min-w-14 text-center tabular-nums"
            data-testid="reading-size"
          >
            {s.size}%
          </span>
          <button
            type="button"
            aria-label={t('reading.bigger')}
            disabled={s.size >= TEXT_SIZES[TEXT_SIZES.length - 1]}
            onClick={() => {
              const i = TEXT_SIZES.indexOf(
                s.size as (typeof TEXT_SIZES)[number],
              )
              s.set.size(TEXT_SIZES[Math.min(TEXT_SIZES.length - 1, i + 1)])
            }}
            className="min-h-11 min-w-11 rounded-lg border border-line text-lg hover:bg-hover disabled:opacity-40"
          >
            A+
          </button>
        </div>
      </div>
      <Choices
        label={t('settings.reading.spacing.label')}
        value={s.spacing}
        options={opt('spacing', LINE_SPACINGS)}
        onPick={s.set.spacing}
      />
      <Choices
        label={t('settings.reading.margin.label')}
        value={s.margin}
        options={opt('margin', MARGINS)}
        onPick={s.set.margin}
      />
      <Choices
        label={t('settings.reading.width.label')}
        value={s.width}
        options={opt('width', WIDTHS)}
        onPick={s.set.width}
      />
      <Choices
        label={t('settings.reading.flow.label')}
        value={s.flow}
        options={opt('flow', FLOWS)}
        onPick={s.set.flow}
      />
      <Choices
        label={t('settings.reading.ruler.label')}
        value={s.ruler}
        options={opt('ruler', RULERS)}
        onPick={s.set.ruler}
      />
      <Choices
        label={t('settings.reading.blanks.label')}
        value={s.blanks}
        options={opt('blanks', BLANK_MODES)}
        onPick={s.set.blanks}
      />
      <div className="mb-1 flex flex-col gap-1 border-t border-line pt-3">
        <Toggle
          label={t('reading.alwaysPage')}
          on={flags.page}
          onChange={(on) => onReadFirst('page', on)}
        />
        <Toggle
          label={t('reading.alwaysNotebook')}
          on={flags.notebook}
          onChange={(on) => onReadFirst('notebook', on)}
        />
        <Toggle
          label={t('reading.lockToReading')}
          on={locked}
          onChange={(on) => readingLocked.set(on)}
        />
      </div>
      <p className="mt-2 text-xs text-muted" data-testid="reading-streak">
        {t('reading.streak', { count: streak })}
      </p>
    </Shell>
  )
}

function Toggle({
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
  onClose,
}: {
  root: HTMLElement | null
  speed: number
  onClose: () => void
}) {
  const state = aloudState.useValue()
  const left = sleepLeft.useValue()
  const voice = voiceChoice.useValue()
  const [voices, setVoices] = useState(listVoices)
  useEffect(() => {
    if (!speechAvailable()) return
    const synth = window.speechSynthesis
    const update = () => setVoices(synth.getVoices())
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
            onClick={() => root && startAloud(root, 0)}
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
      </div>
      <Choices
        label={t('reading.aloud.sleep')}
        value={left === null ? 0 : -1}
        options={[
          { value: 0, label: t('reading.aloud.sleepOff') },
          ...SLEEP_MINUTES.map((m) => ({
            value: m as number,
            label: t('reading.aloud.sleepMinutes', { count: m }),
          })),
        ]}
        onPick={(v) => setSleepTimer(v === 0 ? null : v)}
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

export function OutlinePanel({
  pageId,
  position,
  onClose,
}: {
  pageId: string
  position: ReadingPosition
  onClose: () => void
}) {
  const [marks, setMarks] = useState<Bookmark[]>(() => getBookmarks(pageId))
  const headings = pageHeadings()
  const jump = (id: string) => {
    position.goToBlock(id)
    onClose()
  }
  const add = () => {
    const blockId = position.topBlockId()
    if (!blockId) return
    const el = document.querySelector(
      `.bn-block-outer[data-id="${CSS.escape(blockId)}"]`,
    )
    const label =
      (el?.textContent ?? '').trim().slice(0, 60) ||
      t('reading.bookmarkUntitled')
    setMarks(
      addBookmark(pageId, { blockId, label, progress: position.progress }),
    )
  }
  return (
    <Shell name="outline" title={t('reading.panel.outline')} onClose={onClose}>
      <h3 className="mb-1 text-xs font-medium text-muted">
        {t('reading.outline.headings')}
      </h3>
      {headings.length === 0 ? (
        <p className="mb-3 text-sm text-muted">{t('reading.outline.none')}</p>
      ) : (
        <ul className="mb-3">
          {headings.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => jump(h.id)}
                style={{ paddingInlineStart: 8 + (h.level - 1) * 14 }}
                className="min-h-11 w-full rounded-lg pe-2 text-left text-sm hover:bg-hover"
              >
                {h.text}
              </button>
            </li>
          ))}
        </ul>
      )}
      <h3 className="mb-1 text-xs font-medium text-muted">
        {t('reading.bookmarks')}
      </h3>
      <button type="button" onClick={add} className={`${secondary} mb-2`}>
        {t('reading.bookmarkAdd')}
      </button>
      {marks.length === 0 ? (
        <p className="text-sm text-muted">{t('reading.bookmarksNone')}</p>
      ) : (
        <ul>
          {marks.map((m) => (
            <li key={m.id} className="flex items-center">
              <button
                type="button"
                onClick={() => jump(m.blockId)}
                className="min-h-11 flex-1 rounded-lg px-2 text-left text-sm hover:bg-hover"
              >
                🔖 {m.label}
              </button>
              <button
                type="button"
                aria-label={t('reading.bookmarkRemove', { name: m.label })}
                onClick={() => setMarks(removeBookmark(pageId, m.id))}
                className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted hover:bg-hover"
              >
                <span aria-hidden>✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}
