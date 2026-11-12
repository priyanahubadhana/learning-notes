import { lazy, Suspense, useEffect, useState } from 'react'
import { applyLanguage } from '../i18n/languages'
import { applyTheme, THEMES, type Theme } from '../app/theme'

/**
 * A hidden review page (open it at `#/design-tokens`, not linked from the
 * app): every colour, the type scale, spacing, radius, elevation, glass and
 * the buttons in all states, so the owner can judge the design system on the
 * iPad. It uses the live CSS variables, so it shows what the app uses.
 */
const COLOURS = [
  'canvas',
  'surface-0',
  'surface-1',
  'surface-2',
  'surface-3',
  'neutral-fill',
  'ink',
  'ink-soft',
  'muted',
  'line',
  'line-strong',
  'accent',
  'on-accent',
  'accent-soft',
  'success',
  'warn',
  'danger',
  'select',
  'success-soft',
  'warn-soft',
  'danger-soft',
]
const TYPES = [
  ['display', '40 / 48 · 700'],
  ['title', '32 / 40 · 700'],
  ['h1', '24 / 32 · 650'],
  ['h2', '20 / 28 · 600'],
  ['h3', '17 / 24 · 600'],
  ['body', '15 / 24 · 400'],
  ['small', '13 / 20 · 500'],
  ['micro', '11 / 16 · 600'],
] as const
const SPACES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20]
const RADII = ['xs', 'sm', 'md', 'lg', 'xl', 'pill']
const BUTTONS = ['primary', 'secondary', 'tertiary', 'ghost', 'danger'] as const

/** English only: a review page for the owner, not part of the app screens. */
const T = {
  title: 'Design tokens',
  intro:
    'Review page for the design system (docs/design/system.md). Hidden: not linked from the app.',
  theme: 'Theme',
  reduceGlass: 'Reduce glass',
  reduceMotion: 'Reduce motion',
  width: 'Width',
  parts: 'Parts',
  colour: 'Colour',
  type: 'Type',
  spacing: 'Spacing (4-pt)',
  radius: 'Radius',
  elevation: 'Elevation and glass',
  buttons: 'Buttons',
  glass1: 'Glass over a strong backdrop (frame only).',
  glass2: 'Secondary text on glass.',
  glass3: 'Hint text on glass.',
  buttonsHelp:
    'Hover and press the live buttons. Rows: default, focus, disabled, loading.',
  stDefault: 'Default',
  stFocus: 'Focus',
  stDisabled: 'Disabled',
  stLoading: 'Saving',
  back: 'Back to the app',
}

/** The "Parts" gallery (SP-12): lazy, so nothing is added to the first load. */
const Gallery = lazy(() => import('./gallery'))
const WIDTHS = [390, 820, 1180, 1366] as const

const heading = 't-h2 mt-10 mb-4'

/** The shared parts read their words through t(): load the texts first. */
export default function DesignTokensPage() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    void applyLanguage('en').then(() => setReady(true))
  }, [])
  return ready ? <TokensPage /> : null
}

function TokensPage() {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme) || 'day',
  )
  const [glassLite, setGlassLite] = useState(false)
  const [motionLite, setMotionLite] = useState(false)
  const [width, setWidth] = useState<number | null>(null)
  const pick = (t: Theme) => {
    applyTheme(t)
    setTheme(t)
  }
  const toggleGlass = () => {
    const next = !glassLite
    setGlassLite(next)
    if (next) document.documentElement.dataset.glass = 'lite'
    else delete document.documentElement.dataset.glass
  }
  const toggleMotion = () => {
    const next = !motionLite
    setMotionLite(next)
    if (next) document.documentElement.dataset.motion = 'reduce'
    else delete document.documentElement.dataset.motion
  }
  return (
    <div
      data-testid="design-tokens"
      className="bg-wash text-ink min-h-dvh px-4 py-8 wide:px-8"
    >
      <main className="mx-auto max-w-4xl">
        <h1 className="t-title">{T.title}</h1>
        <p className="t-body text-ink-soft mt-2">{T.intro}</p>
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label={T.theme}
        >
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              className={`ds-btn ${theme === t ? 'ds-primary' : 'ds-secondary'}`}
              aria-pressed={theme === t}
              onClick={() => pick(t)}
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            className={`ds-btn ${glassLite ? 'ds-primary' : 'ds-secondary'}`}
            aria-pressed={glassLite}
            onClick={toggleGlass}
          >
            {T.reduceGlass}
          </button>
          <button
            type="button"
            className={`ds-btn ${motionLite ? 'ds-primary' : 'ds-secondary'}`}
            aria-pressed={motionLite}
            data-testid="gal-reduce-motion"
            onClick={toggleMotion}
          >
            {T.reduceMotion}
          </button>
        </div>
        <div
          className="mt-2 flex flex-wrap gap-2"
          role="group"
          aria-label={T.width}
        >
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              className={`ds-btn ${width === w ? 'ds-primary' : 'ds-secondary'}`}
              aria-pressed={width === w}
              data-testid={`gal-width-${w}`}
              onClick={() => setWidth(width === w ? null : w)}
            >
              {w}
            </button>
          ))}
        </div>

        <h2 className={heading}>{T.colour}</h2>
        <ul className="grid grid-cols-2 gap-3 wide:grid-cols-4">
          {COLOURS.map((c) => (
            <li
              key={c}
              className="bg-surface-1 flex items-center gap-3 rounded-[var(--r-md)] p-3 shadow-[var(--elev-1)]"
            >
              <span
                aria-hidden
                className="border-line-strong size-10 shrink-0 rounded-[var(--r-sm)] border"
                style={{ background: `var(--color-${c})` }}
              />
              <span className="t-small break-words">{c}</span>
            </li>
          ))}
        </ul>

        <h2 className={heading}>{T.type}</h2>
        <ul className="bg-surface-1 divide-line divide-y rounded-[var(--r-md)] px-4 shadow-[var(--elev-1)]">
          {TYPES.map(([n, spec]) => (
            <li
              key={n}
              className="flex items-baseline justify-between gap-4 py-3"
            >
              <span className={`t-${n}`}>
                {n === 'micro' ? 'Group label' : `The quick ${n}`}
              </span>
              <span className="t-small text-muted shrink-0">{spec}</span>
            </li>
          ))}
        </ul>

        <h2 className={heading}>{T.spacing}</h2>
        <ul className="flex flex-col gap-2">
          {SPACES.map((n) => (
            <li key={n} className="flex items-center gap-3">
              <span className="t-small text-muted w-16 shrink-0">
                {n} · {`${n * 4}px`}
              </span>
              <span
                className="bg-accent block h-4 rounded-[var(--r-xs)]"
                style={{ width: `var(--space-${n})` }}
              />
            </li>
          ))}
        </ul>

        <h2 className={heading}>{T.radius}</h2>
        <ul className="flex flex-wrap gap-4">
          {RADII.map((r) => (
            <li key={r} className="text-center">
              <span
                className="bg-accent-soft border-accent block size-16 border-2"
                style={{ borderRadius: `var(--r-${r})` }}
              />
              <span className="t-small text-muted">{r}</span>
            </li>
          ))}
        </ul>

        <h2 className={heading}>{T.elevation}</h2>
        <ul className="flex flex-wrap gap-6">
          {[1, 2, 3].map((n) => (
            <li
              key={n}
              className="bg-surface-1 t-small grid h-20 w-32 place-items-center rounded-[var(--r-md)]"
              style={{ boxShadow: `var(--elev-${n})` }}
            >
              {`elev ${n}`}
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-[var(--r-lg)] bg-gradient-to-br from-violet-500 to-sky-400 p-6">
          <div className="glass t-body rounded-[var(--r-lg)] p-4">
            <p>{T.glass1}</p>
            <p className="text-ink-soft t-small">{T.glass2}</p>
            <p className="text-muted t-small">{T.glass3}</p>
          </div>
        </div>

        <h2 className={heading}>{T.buttons}</h2>
        <p className="t-small text-muted mb-3">{T.buttonsHelp}</p>
        <div className="flex flex-col gap-4">
          {BUTTONS.map((b) => (
            <div key={b} className="flex flex-wrap items-center gap-3">
              <span className="t-small text-muted w-20">{b}</span>
              <button type="button" className={`ds-btn ds-${b}`}>
                {T.stDefault}
              </button>
              <button
                type="button"
                className={`ds-btn ds-${b}`}
                style={{
                  outline: '2px solid var(--color-accent)',
                  outlineOffset: 2,
                }}
              >
                {T.stFocus}
              </button>
              <button type="button" className={`ds-btn ds-${b}`} disabled>
                {T.stDisabled}
              </button>
              <button
                type="button"
                className={`ds-btn ds-${b}`}
                aria-busy="true"
                style={{ minWidth: 112 }}
              >
                <span className="ds-spinner" aria-hidden />
                {T.stLoading}
              </button>
            </div>
          ))}
        </div>
        <h2 className={heading}>{T.parts}</h2>
        <div className="overflow-x-auto">
          <div
            data-testid="gal-frame"
            data-width={width ?? 'fill'}
            style={{ width: width ?? '100%', maxWidth: '100%' }}
          >
            <Suspense fallback={null}>
              <Gallery />
            </Suspense>
          </div>
        </div>
        <p className="mt-10">
          <a className="text-accent underline" href="#/">
            {T.back}
          </a>
        </p>
      </main>
    </div>
  )
}
