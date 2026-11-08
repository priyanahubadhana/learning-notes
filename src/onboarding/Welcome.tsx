import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t, type MessageKey } from '../i18n/t'
import { offerLastToolOnce } from '../app/tools/main/mainTools'
import { chosenKind, devicePickerDone } from '../app/tools/deviceKind'
import { suggestKind, browserFacts } from '../app/tools/deviceKind'
import type { DeviceMode } from '../app/deviceMode'
import {
  applyDeviceMode,
  deviceModeSetting,
  languageSetting,
  theme as themeSetting,
} from '../settings/builtinSettings'
import { onboardingGuide } from '../app/signInGuideState'
import { readDeviceSetting } from '../settings/settingsService'
import { useDeviceSetting } from '../settings/useSetting'
import type { SettingDefinition } from '../settings/registry'
import {
  onboardingAccountAsked,
  onboardingDone,
  onboardingPending,
} from './onboardingState'

/**
 * The first-run welcome (polish 2, item 1): one sheet, three steps. (1) How
 * will you write? Keyboard, Finger or Apple Pencil, which sets the device
 * mode. (2) Language and theme. (3) A "Start here" sample notebook, or empty.
 * Skip is always there and writes nothing but "seen". It shows once; Settings
 * › Device › Show the welcome again opens it. Lazy-loaded (not in the first
 * download).
 */

const WAYS = ['keyboard', 'finger', 'pencil'] as const
type Way = (typeof WAYS)[number]
const MODE_OF: Record<Way, DeviceMode> = {
  keyboard: 'computer',
  finger: 'touch',
  pencil: 'pencil',
}
const STEPS = 3

function startWay(): Way {
  const mode = readDeviceSetting(deviceModeSetting)
  const s = suggestKind(browserFacts(mode))
  return s.pencil ? 'pencil' : s.kind === 'computer' ? 'keyboard' : 'finger'
}

/** The choices of a segmented setting, as buttons that apply at once. */
function SettingButtons<T extends string>({
  definition,
}: {
  definition: SettingDefinition<T>
}) {
  const [value, setValue] = useDeviceSetting(definition)
  const control = definition.control
  if (control.kind !== 'segmented') return null
  return (
    <div
      role="radiogroup"
      aria-label={t(definition.labelKey)}
      className="flex flex-wrap gap-2"
    >
      {control.options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => setValue(o.value as T)}
          className={`min-h-11 rounded-xl border px-4 text-sm ${
            value === o.value
              ? 'border-accent bg-hover font-semibold text-accent'
              : 'border-line hover:bg-hover'
          }`}
        >
          {o.label()}
        </button>
      ))}
    </div>
  )
}

export function Welcome({
  onFinish,
  onSkip,
  signedIn,
}: {
  /** Finished: `sample` says whether to make the Start here notebook. */
  onFinish: (sample: boolean) => void
  onSkip: () => void
  /** Already signed in (from the sync status): skip the account question. */
  signedIn: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  // Step 0 (fix #1 A) asks once: sign in with Google, or use without an account.
  const [step, setStep] = useState(() =>
    onboardingAccountAsked.get() || signedIn ? 1 : 0,
  )
  const [offline, setOffline] = useState(false)
  const [way, setWay] = useState<Way>(startWay)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  /** Step 1 is kept when moving on (not on Skip). */
  const applyWay = () => {
    applyDeviceMode(MODE_OF[way])
    chosenKind.set(
      way === 'keyboard'
        ? 'computer'
        : way === 'pencil' || window.innerWidth >= 600
          ? 'tablet'
          : 'phone',
    )
    devicePickerDone.set(true)
    if (way === 'pencil') offerLastToolOnce()
  }
  const seen = () => {
    onboardingDone.set(true)
    onboardingPending.set(false)
    devicePickerDone.set(true)
  }
  const next = () => {
    if (step === 1) applyWay()
    setStep(step + 1)
  }
  const finish = (sample: boolean) => {
    seen()
    onFinish(sample)
  }
  const skip = () => {
    seen()
    onSkip()
  }
  const useLocal = () => {
    onboardingAccountAsked.set(true)
    setStep(1)
  }
  /** Starts the guided sign-in; the welcome waits until the guide is done. */
  const signInFirst = () => {
    setOffline(false)
    if (!navigator.onLine) {
      setOffline(true)
      return
    }
    onboardingAccountAsked.set(true)
    onboardingGuide.set(true)
  }

  return createPortal(
    <dialog
      ref={ref}
      data-testid="welcome"
      data-palm-guard
      aria-label={t('welcome.title')}
      onCancel={(e) => {
        e.preventDefault()
        skip()
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-bg p-5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop:bg-black/40"
    >
      {step > 0 && (
        <p className="text-xs text-muted" data-welcome-step={step}>
          {t('welcome.step', { n: step, total: STEPS })}
        </p>
      )}
      {step === 0 && (
        <>
          <h2 className="mt-1 text-lg font-semibold">
            {t('welcome.account.title')}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {t('welcome.account.help')}
          </p>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              data-account="google"
              onClick={signInFirst}
              className="min-h-14 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              {t('sync.signIn')}
            </button>
            <button
              type="button"
              data-account="local"
              onClick={useLocal}
              className="min-h-14 rounded-xl border border-line px-4 text-left hover:bg-hover"
            >
              <span className="block text-sm font-semibold">
                {t('welcome.account.local')}
              </span>
              <span className="block text-sm text-ink-soft">
                {t('welcome.account.localHelp')}
              </span>
            </button>
            {offline && (
              <p role="alert" className="text-sm text-danger">
                {t('welcome.account.offline')}
              </p>
            )}
          </div>
        </>
      )}
      {step === 1 && (
        <>
          <h2 className="mt-1 text-lg font-semibold">
            {t('welcome.way.title')}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{t('welcome.way.help')}</p>
          <div
            role="radiogroup"
            aria-label={t('welcome.way.title')}
            className="mt-3 grid gap-2"
          >
            {WAYS.map((w) => (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={way === w}
                data-way={w}
                onClick={() => setWay(w)}
                className={`min-h-14 rounded-xl border px-4 py-2 text-left ${
                  way === w
                    ? 'border-accent bg-hover'
                    : 'border-line hover:bg-hover'
                }`}
              >
                <span
                  className={`block text-sm font-semibold ${way === w ? 'text-accent' : ''}`}
                >
                  {t(`welcome.way.${w}` as MessageKey)}
                </span>
                <span className="block text-sm text-ink-soft">
                  {t(`welcome.way.${w}.line` as MessageKey)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <h2 className="mt-1 text-lg font-semibold">
            {t('welcome.look.title')}
          </h2>
          <h3 className="mt-3 mb-1 text-sm font-semibold">
            {t('settings.language.label')}
          </h3>
          <SettingButtons definition={languageSetting} />
          <h3 className="mt-3 mb-1 text-sm font-semibold">
            {t('settings.theme.label')}
          </h3>
          <SettingButtons definition={themeSetting} />
        </>
      )}
      {step === 3 && (
        <>
          <h2 className="mt-1 text-lg font-semibold">
            {t('welcome.start.title')}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {t('welcome.start.help')}
          </p>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              data-start="sample"
              onClick={() => finish(true)}
              className="min-h-14 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              {t('welcome.start.sample')}
            </button>
            <button
              type="button"
              data-start="empty"
              onClick={() => finish(false)}
              className="min-h-14 rounded-xl border border-line px-4 text-sm hover:bg-hover"
            >
              {t('welcome.start.empty')}
            </button>
          </div>
        </>
      )}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={skip}
          className="min-h-11 rounded-xl px-3 text-sm text-ink-soft hover:bg-hover"
        >
          {t('welcome.skip')}
        </button>
        <span className="grow" />
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="min-h-11 rounded-xl border border-line px-4 text-sm hover:bg-hover"
          >
            {t('welcome.back')}
          </button>
        )}
        {step > 0 && step < STEPS && (
          <button
            type="button"
            onClick={next}
            className="min-h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:opacity-90"
          >
            {t('welcome.next')}
          </button>
        )}
      </div>
    </dialog>,
    document.body,
  )
}
