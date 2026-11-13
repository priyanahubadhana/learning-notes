import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePref } from '../../app/usePref'
import { t } from '../../i18n/t'
import './SlidesPresent.css'

const THEMES = ['day', 'night', 'sepia'] as const
type SlideTheme = (typeof THEMES)[number]
const isTheme = (v: unknown): v is SlideTheme =>
  THEMES.some((theme) => theme === v)
const THEME_TEXT = {
  day: 'settings.theme.day',
  night: 'settings.theme.night',
  sepia: 'settings.theme.sepia',
} as const

const SWIPE = 50

/**
 * Present a slide deck full screen (slice 15, ST25): one slide at a time,
 * swipe or arrow keys to move, a theme for the backdrop, Save, and ✕.
 */
export function SlidesPresent({
  count,
  render,
  onSave,
  onClose,
}: {
  count: number
  /** Draws slide `index` (0-based). */
  render: (index: number) => ReactNode
  onSave: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const down = useRef<number | null>(null)
  const [index, setIndex] = useState(0)
  const [theme, setTheme] = usePref('slidesTheme', isTheme, 'night')
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    // A manual popover sits in the top layer but, unlike a modal dialog,
    // leaves the theme menu (opened later, also in the top layer) usable.
    dialog.showPopover()
    dialog.focus()
    dialog.requestFullscreen?.().catch(() => {})
    return () => {
      if (dialog.matches(':popover-open')) dialog.hidePopover()
      if (document.fullscreenElement === dialog)
        void document.exitFullscreen().catch(() => {})
    }
  }, [])
  const go = (step: number) =>
    setIndex((i) => Math.min(count - 1, Math.max(0, i + step)))
  return (
    <div
      ref={ref}
      popover="manual"
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className="slides-present"
      data-theme-slides={theme}
      data-testid="slides-present"
      aria-label={t('st25.present')}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
        if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1)
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1)
      }}
      onPointerDown={(e) => {
        down.current = e.clientX
      }}
      onPointerUp={(e) => {
        if (down.current === null) return
        const dx = e.clientX - down.current
        down.current = null
        if (Math.abs(dx) >= SWIPE) go(dx < 0 ? 1 : -1)
      }}
    >
      <div className="slides-present__bar">
        <span role="status" className="slides-present__count">
          {t('st25.position', { n: index + 1, total: count })}
        </span>
        <div className="slides-present__menuwrap">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menu}
            className="slides-present__btn"
            onClick={() => setMenu(!menu)}
          >
            {t('st25.theme')} ▾
          </button>
          {menu && (
            <div
              role="menu"
              aria-label={t('st25.theme')}
              className="slides-present__menu"
            >
              {THEMES.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={theme === value}
                  className="slides-present__item"
                  onClick={() => {
                    setTheme(value)
                    setMenu(false)
                  }}
                >
                  {t(THEME_TEXT[value])}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="slides-present__btn" onClick={onSave}>
          {t('tabs.slides.save')}
        </button>
        <button
          type="button"
          aria-label={t('st25.close')}
          className="slides-present__btn"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="slides-present__stage">
        <button
          type="button"
          aria-label={t('st25.previous')}
          disabled={index === 0}
          className="slides-present__nav"
          onClick={() => go(-1)}
        >
          ‹
        </button>
        <div className="slides-present__slide" data-testid="present-slide">
          {render(index)}
        </div>
        <button
          type="button"
          aria-label={t('st25.next')}
          disabled={index >= count - 1}
          className="slides-present__nav"
          onClick={() => go(1)}
        >
          ›
        </button>
      </div>
    </div>
  )
}
