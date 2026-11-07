import { Tip } from '../../help/Help'
import { use } from 'react'
import { t } from '../../i18n/t'
import { THEMES, THEME_SWATCH, type Theme } from '../theme'
import { ThemeContext } from '../themeContext'
import { AnchoredMenu } from './AnchoredMenu'
import { useAnchoredMenu } from './useAnchoredMenu'
import { Icon } from './icons'
import { getAppActions } from './toolRuntime'

/**
 * The small arrow beside the Theme button: it opens a list of every theme with
 * a preview swatch and a tick on the current one. The Theme button itself
 * still cycles to the next theme in one tap.
 */
export function ThemeArrow({
  px,
  vertical,
  onRun,
}: {
  px: number
  /** Called after a theme was chosen (the ribbon closes its tools). */
  onRun?: () => void
  /** True on the ribbon, where the button is a tall tile. */
  vertical?: boolean
}) {
  const current = use(ThemeContext)
  const menu = useAnchoredMenu()
  const choose = (theme: Theme) => {
    menu.close()
    getAppActions()?.setTheme(theme)
    onRun?.()
  }
  return (
    <>
      <Tip
        id="theme.list"
        touchInfo={false}
        className="inline-flex self-stretch"
      >
        <button
          type="button"
          data-bar-btn
          data-action="themeList"
          {...menu.trigger}
          aria-label={t('theme.pick')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={menu.toggle}
          style={{ minHeight: vertical ? undefined : px, minWidth: 28 }}
          className={`grid shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-hover hover:text-ink ${
            vertical ? 'self-stretch' : ''
          }`}
        >
          <Icon name="chevronDown" size={14} />
        </button>
      </Tip>
      <AnchoredMenu menu={menu} label={t('theme.pick')}>
        {THEMES.map((name) => {
          const swatch = THEME_SWATCH[name]
          return (
            <button
              key={name}
              type="button"
              role="menuitemradio"
              aria-checked={name === current}
              data-theme-option={name}
              onClick={() => choose(name)}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-sm hover:bg-hover"
            >
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-md border border-ink-soft text-[13px] font-semibold"
                style={{ background: swatch.page, color: swatch.ink }}
              >
                A
                <span
                  className="-mt-1 h-0.5 w-3.5 rounded-full"
                  style={{ background: swatch.accent }}
                />
              </span>
              <span className="flex-1">{t(`theme.${name}`)}</span>
              {name === current && (
                <span aria-hidden className="text-accent">
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </AnchoredMenu>
    </>
  )
}
