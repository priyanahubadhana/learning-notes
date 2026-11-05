import type { ReactNode } from 'react'
import { t } from '../../../i18n/t'
import { PopupClose } from '../PopupClose'
import { Icon, type IconName } from '../icons'

/** Small building blocks shared by the detail cards (all 44 px targets). */

import { keepFocus } from './pillKit'

/** The card's top row: ‹ back (on a sub-page), the title, nothing else. */
export function CardHeader({
  title,
  onBack,
  onClose,
}: {
  title: string
  onBack?: () => void
  onClose?: () => void
}) {
  return (
    <div className="flex min-h-11 items-center gap-1">
      {onBack && (
        <button
          type="button"
          data-card-back
          aria-label={t('main.card.back')}
          title={t('main.card.back')}
          onMouseDown={keepFocus}
          onClick={onBack}
          className="grid size-11 shrink-0 place-items-center rounded-lg text-ink hover:bg-hover"
        >
          <Icon name="chevronLeft" />
        </button>
      )}
      <strong className="min-w-0 flex-1 truncate text-sm">{title}</strong>
      {onClose && <PopupClose onClose={onClose} />}
    </div>
  )
}

/** A row that opens a sub-page: "Pen settings ›". */
export function NavRow({
  label,
  hint,
  onClick,
  id,
}: {
  label: string
  hint?: string
  onClick: () => void
  id: string
}) {
  return (
    <button
      type="button"
      data-card-nav={id}
      onMouseDown={keepFocus}
      onClick={onClick}
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 text-start text-sm hover:bg-hover"
    >
      <span>{label}</span>
      <span className="flex items-center gap-1 text-xs text-ink-soft">
        {hint}
        <Icon name="chevronRight" size={16} className="rtl:rotate-180" />
      </span>
    </button>
  )
}

/** An on/off row. */
export function SwitchRow({
  label,
  on,
  onChange,
  id,
  note,
}: {
  label: string
  on: boolean
  onChange: (next: boolean) => void
  id: string
  note?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      data-card-switch={id}
      onMouseDown={keepFocus}
      onClick={() => onChange(!on)}
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 text-start text-sm hover:bg-hover"
    >
      <span className="min-w-0">
        {label}
        {note && <span className="block text-xs text-ink-soft">{note}</span>}
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-10 shrink-0 rounded-full border border-ink-soft ${
          on ? 'bg-accent' : 'bg-hover'
        }`}
      >
        <span
          className={`absolute top-0.5 size-4.5 rounded-full bg-bg shadow motion-safe:transition-all ${
            on ? 'start-[1.1rem]' : 'start-0.5'
          }`}
        />
      </span>
    </button>
  )
}

/** A slider with its name and value. */
export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  id,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (next: number) => void
  id: string
}) {
  return (
    <label className="grid gap-0.5 px-2 py-1 text-sm">
      <span className="flex justify-between gap-3">
        <span>{label}</span>
        <span className="text-ink-soft tabular-nums">
          {Math.round(value * 10) / 10}
          {unit}
        </span>
      </span>
      <input
        type="range"
        data-card-slider={id}
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full cursor-pointer accent-[var(--color-accent)]"
      />
    </label>
  )
}

/** A choice of a few, as big chips. */
export function ChipRow<T extends string | number>({
  label,
  value,
  options,
  onChange,
  id,
  columns,
}: {
  label?: string
  value: T
  options: readonly { value: T; label: string; icon?: IconName }[]
  onChange: (next: T) => void
  id: string
  columns?: number
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-card-chips={id}
      className="grid gap-1 px-1 py-0.5"
      style={{
        gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((option) => {
        const on = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={on}
            data-chip={String(option.value)}
            onMouseDown={keepFocus}
            onClick={() => onChange(option.value)}
            className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 text-xs ${
              on
                ? 'border-accent bg-hover font-semibold text-accent'
                : 'border-line text-ink hover:bg-hover'
            }`}
          >
            {option.icon && <Icon name={option.icon} size={18} />}
            <span className="leading-tight">{option.label}</span>
            {on && (
              <span aria-hidden className="h-0.5 w-4 rounded bg-current" />
            )}
          </button>
        )
      })}
    </div>
  )
}

/** A heading inside a card. */
export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 pt-1 text-[11px] tracking-[0.06em] text-muted uppercase">
      {children}
    </div>
  )
}

/** A button row for an action. */
export function ActionRow({
  label,
  onClick,
  id,
  icon,
  disabled,
  note,
}: {
  label: string
  onClick: () => void
  id: string
  icon?: IconName
  disabled?: boolean
  note?: string
}) {
  return (
    <button
      type="button"
      data-card-action={id}
      aria-disabled={disabled || undefined}
      onMouseDown={keepFocus}
      onClick={onClick}
      className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-start text-sm hover:bg-hover aria-disabled:opacity-60"
    >
      {icon && <Icon name={icon} size={18} />}
      <span className="min-w-0">
        {label}
        {note && <span className="block text-xs text-ink-soft">{note}</span>}
      </span>
    </button>
  )
}
