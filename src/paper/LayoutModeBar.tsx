import { t } from '../i18n/t'
import type { MessageKey } from '../i18n/t'
import { PRESETS, type Preset } from './grid'

/**
 * The strip at the top of Layout mode (owner batch 3, B3-7/8): the ready-made
 * layouts (tap one: the page changes at once, then fine-tune by dragging), the
 * plain coach line, Undo (the whole session is one step), "Apply to all pages"
 * and Done. Loaded only when Layout mode opens.
 */
export default function LayoutModeBar({
  active,
  canUndo,
  onPreset,
  onUndo,
  onApplyAll,
  onDone,
}: {
  active: string | null
  canUndo: boolean
  onPreset: (id: string) => void
  onUndo: () => void
  onApplyAll: () => void
  onDone: () => void
}) {
  const btn =
    'min-h-[44px] shrink-0 rounded-lg px-3 text-sm hover:bg-hover disabled:opacity-40'
  return (
    <div
      role="toolbar"
      aria-label={t('layout.title')}
      className="rounded-xl border border-line bg-surface-3 p-2 shadow-[var(--elev-2)]"
    >
      <div className="flex items-center gap-1 overflow-x-auto">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            data-ui
            data-layout-preset={p.id}
            aria-pressed={active === p.id}
            onClick={() => onPreset(p.id)}
            className={
              btn +
              ' flex items-center gap-2 ' +
              (active === p.id
                ? 'bg-hover font-semibold text-accent'
                : 'text-ink')
            }
          >
            <Schematic preset={p} />
            <span>{t(('layout.' + p.id) as MessageKey)}</span>
          </button>
        ))}
        <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden />
        <button
          type="button"
          data-ui
          data-layout-undo
          disabled={!canUndo}
          onClick={onUndo}
          className={btn + ' text-ink'}
        >
          {t('layout.mode.undo')}
        </button>
        <button
          type="button"
          data-ui
          data-layout-all
          onClick={onApplyAll}
          className={btn + ' text-ink'}
        >
          {t('layout.mode.all')}
        </button>
        <button
          type="button"
          data-ui
          data-layout-done
          onClick={onDone}
          className={btn + ' ml-auto bg-accent font-semibold text-white'}
        >
          {t('layout.assist.done')}
        </button>
      </div>
      <p data-layout-coach className="mt-1 px-1 text-sm text-muted">
        {t('layout.mode.coach')}
      </p>
    </div>
  )
}

/** A tiny picture of a preset: columns, with their stacked boxes. */
function Schematic({ preset }: { preset: Preset }) {
  const gap = 2
  const W = 28
  const H = 20
  return (
    <svg width={W} height={H} aria-hidden className="shrink-0">
      {preset.cols.map((c, i) => {
        const x = preset.cols
          .slice(0, i)
          .reduce(
            (sum, p) => sum + p.w * (W - gap * (preset.cols.length - 1)) + gap,
            0,
          )
        const w = c.w * (W - gap * (preset.cols.length - 1))
        const h = (H - gap * (c.stack - 1)) / c.stack
        const out = Array.from({ length: c.stack }, (_, j) => (
          <rect
            key={i + ':' + j}
            x={x}
            y={j * (h + gap)}
            width={w}
            height={h}
            rx={2}
            fill="currentColor"
            opacity={0.55}
          />
        ))
        return out
      })}
    </svg>
  )
}
