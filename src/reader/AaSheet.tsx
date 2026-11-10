import { useState } from 'react'
import { t } from '../i18n/t'
import type { MessageKey } from '../i18n/t'
import {
  FONTS,
  PAGE_COLOURS,
  PAGE_PALETTE,
  PROGRESS,
  THEMES,
  themePreset,
  type ReadStyle,
} from './readStyle'

const TABS = ['font', 'layout', 'themes', 'more'] as const
type Tab = (typeof TABS)[number]

const seg = (on: boolean) =>
  `min-h-11 flex-1 rounded-lg border px-2 text-sm ${
    on ? 'border-accent bg-hover font-semibold' : 'border-line hover:bg-hover'
  }`

/**
 * The Kindle-style Aa sheet (item 34): Font, Layout, Themes, More. A bottom
 * sheet; every change is applied at once and remembered on this device.
 * EPUB gets everything; a PDF gets page colour, dim, progress and clock
 * (its text cannot be reflowed).
 */
export default function AaSheet({
  look,
  onLook,
  size,
  onSize,
  flow,
  onFlow,
  format,
  onClose,
}: {
  look: ReadStyle
  onLook: (patch: Partial<ReadStyle>) => void
  size: number
  onSize: (n: number) => void
  flow: 'paginated' | 'scrolled'
  onFlow: (f: 'paginated' | 'scrolled') => void
  format: 'pdf' | 'epub'
  onClose: () => void
}) {
  const epub = format === 'epub'
  const [tab, setTab] = useState<Tab>(epub ? 'font' : 'layout')
  const tabs = epub ? TABS : (['layout', 'more'] as const)
  const k = (key: string) => t(key as MessageKey)
  return (
    <div
      data-chrome
      role="dialog"
      aria-label={t('aa.title')}
      data-testid="aa-sheet"
      className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-xl rounded-t-2xl border border-line bg-bg p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl"
    >
      <div className="mb-2 flex items-center gap-1" role="tablist">
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            data-testid={`aa-tab-${id}`}
            onClick={() => setTab(id)}
            className={`min-h-11 flex-1 rounded-lg px-2 text-sm ${
              tab === id
                ? 'bg-hover font-semibold text-accent'
                : 'text-ink-soft'
            }`}
          >
            {k(`aa.tab.${id}`)}
          </button>
        ))}
        <button
          type="button"
          aria-label={t('aa.close')}
          data-testid="aa-close"
          onClick={onClose}
          className="min-h-11 min-w-11 rounded-lg hover:bg-hover"
        >
          ✕
        </button>
      </div>
      <div className="max-h-[50vh] space-y-3 overflow-y-auto">
        {tab === 'font' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map((f) => (
                <button
                  key={f}
                  type="button"
                  data-testid={`aa-font-${f}`}
                  aria-pressed={look.font === f}
                  className={seg(look.font === f)}
                  onClick={() => onLook({ font: f })}
                >
                  {k(`aa.font.${f}`)}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0">{t('aa.size')}</span>
              <input
                type="range"
                min={70}
                max={250}
                step={5}
                value={size}
                data-testid="aa-size"
                aria-label={t('aa.size')}
                onChange={(e) => onSize(Number(e.target.value))}
                className="min-h-11 flex-1"
              />
              <span className="w-12 text-end tabular-nums">{size}%</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0">{t('aa.spacing')}</span>
              <input
                type="range"
                min={1.2}
                max={2.2}
                step={0.1}
                value={look.spacing}
                data-testid="aa-spacing"
                aria-label={t('aa.spacing')}
                onChange={(e) => onLook({ spacing: Number(e.target.value) })}
                className="min-h-11 flex-1"
              />
              <span className="w-12 text-end tabular-nums">
                {look.spacing.toFixed(1)}
              </span>
            </label>
          </>
        )}
        {tab === 'layout' && (
          <>
            <p className="text-xs text-muted">{t('aa.pageColour')}</p>
            <div className="flex gap-2">
              {PAGE_COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  data-testid={`aa-page-${c}`}
                  aria-pressed={look.page === c}
                  aria-label={k(`aa.page.${c}`)}
                  className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg border px-1 text-xs ${
                    look.page === c ? 'border-accent bg-hover' : 'border-line'
                  }`}
                  onClick={() => onLook({ page: c })}
                >
                  <span
                    aria-hidden
                    className="size-5 rounded-full border border-line"
                    style={{
                      background:
                        c === 'theme' ? 'var(--color-bg)' : PAGE_PALETTE[c].bg,
                    }}
                  />
                  {k(`aa.page.${c}`)}
                </button>
              ))}
            </div>
            {epub && (
              <>
                <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
                  {t('aa.continuous')}
                  <input
                    type="checkbox"
                    checked={flow === 'scrolled'}
                    data-testid="aa-continuous"
                    onChange={(e) =>
                      onFlow(e.target.checked ? 'scrolled' : 'paginated')
                    }
                    className="size-5"
                  />
                </label>
                <div className="flex gap-2">
                  {(['left', 'justify'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      data-testid={`aa-align-${a}`}
                      aria-pressed={look.align === a}
                      className={seg(look.align === a)}
                      onClick={() => onLook({ align: a })}
                    >
                      {k(`aa.align.${a}`)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted">{t('aa.margins')}</p>
                <div className="flex gap-2">
                  {(['s', 'm', 'l'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      data-testid={`aa-margin-${m}`}
                      aria-pressed={look.margin === m}
                      className={seg(look.margin === m)}
                      onClick={() => onLook({ margin: m })}
                    >
                      {k(`aa.margin.${m}`)}
                    </button>
                  ))}
                </div>
              </>
            )}
            <label className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0">{t('aa.dim')}</span>
              <input
                type="range"
                min={0}
                max={60}
                step={5}
                value={look.dim}
                data-testid="aa-dim"
                aria-label={t('aa.dim')}
                onChange={(e) => onLook({ dim: Number(e.target.value) })}
                className="min-h-11 flex-1"
              />
            </label>
            <p className="text-xs text-muted">{t('aa.dim.note')}</p>
          </>
        )}
        {tab === 'themes' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((id) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`aa-theme-${id}`}
                  className={seg(false)}
                  onClick={() => {
                    const p = themePreset(id, look.custom)
                    onSize(p.size)
                    onLook({ spacing: p.spacing, margin: p.margin })
                  }}
                >
                  {k(`aa.theme.${id}`)}
                </button>
              ))}
            </div>
            <button
              type="button"
              data-testid="aa-theme-save"
              className={seg(false)}
              onClick={() =>
                onLook({
                  custom: { size, spacing: look.spacing, margin: look.margin },
                })
              }
            >
              {t('aa.theme.save')}
            </button>
          </>
        )}
        {tab === 'more' && (
          <>
            <p className="text-xs text-muted">{t('aa.progress')}</p>
            <div className="flex gap-2">
              {PROGRESS.map((p) => (
                <button
                  key={p}
                  type="button"
                  data-testid={`aa-progress-${p}`}
                  aria-pressed={look.progress === p}
                  className={seg(look.progress === p)}
                  onClick={() => onLook({ progress: p })}
                >
                  {k(`aa.progress.${p}`)}
                </button>
              ))}
            </div>
            <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
              {t('aa.clock')}
              <input
                type="checkbox"
                checked={look.clock}
                data-testid="aa-clock"
                onChange={(e) => onLook({ clock: e.target.checked })}
                className="size-5"
              />
            </label>
            <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
              {t('aa.menuOnSelect')}
              <input
                type="checkbox"
                checked={look.menuOnSelect}
                data-testid="aa-menu"
                onChange={(e) => onLook({ menuOnSelect: e.target.checked })}
                className="size-5"
              />
            </label>
            <p className="text-xs text-muted">{t('aa.readAloud.where')}</p>
          </>
        )}
      </div>
    </div>
  )
}
