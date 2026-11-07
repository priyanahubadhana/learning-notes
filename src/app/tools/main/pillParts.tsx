import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons'
import { PILL_BUTTON, keepFocus } from './pillKit'

/** Pieces the options pill is made of (all 44 px, never colour alone). */

/** One option of a pill. `data-pill-option` is what press-and-slide finds. */
export function PillButton({
  id,
  label,
  icon,
  pressed,
  expanded,
  disabled,
  coming,
  hint,
  onClick,
  children,
  className = '',
}: {
  id: string
  label: string
  icon?: IconName
  pressed?: boolean
  expanded?: boolean
  disabled?: boolean
  /** Not built yet: dimmed, says why when pressed. */
  coming?: boolean
  /** Why it is not built yet (shown in the tooltip). */
  hint?: string
  onClick: () => void
  children?: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      data-pill-option={id}
      data-coming={coming ? '' : undefined}
      aria-label={label}
      aria-description={hint || undefined}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-disabled={disabled || undefined}
      onMouseDown={keepFocus}
      onClick={onClick}
      className={`${PILL_BUTTON} ${pressed ? 'bg-hover !text-accent' : ''} ${className}`}
    >
      {children ?? (icon && <Icon name={icon} />)}
      {pressed && (
        <span
          aria-hidden
          className="absolute bottom-1 h-0.5 w-3.5 rounded-full bg-current"
        />
      )}
    </button>
  )
}

/** A small ▾ beside an option: opens its detail card. */
export function Caret({
  id,
  label,
  open,
  onClick,
}: {
  id: string
  label: string
  open: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-pill-caret={id}
      aria-label={label}
      aria-expanded={open}
      onMouseDown={keepFocus}
      onClick={onClick}
      className="grid min-h-11 w-6 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-hover hover:text-ink"
    >
      <Icon name="chevronDown" size={14} />
    </button>
  )
}

/** A colour dot (with a tick when chosen, so colour is never the only clue). */
export function Swatch({
  hex,
  name,
  on,
  onClick,
  id,
  size = 24,
}: {
  hex: string
  name: string
  on: boolean
  onClick: () => void
  id: string
  size?: number
}) {
  return (
    <button
      type="button"
      data-pill-option={id}
      data-colour={hex}
      aria-label={name}
      aria-pressed={on}
      onMouseDown={keepFocus}
      onClick={onClick}
      className="relative grid min-h-11 min-w-9 shrink-0 place-items-center rounded-xl hover:bg-hover data-[hot]:ring-2 data-[hot]:ring-accent"
    >
      <span
        className={`grid place-items-center rounded-full border-2 ${
          on ? 'border-ink' : 'border-line'
        }`}
        style={{ width: size, height: size, backgroundColor: hex }}
      >
        {on && (
          <Icon
            name="check"
            size={size - 10}
            className="text-[#1d1d1f] mix-blend-normal"
          />
        )}
      </span>
    </button>
  )
}

/** A thickness chip: a dot (or bar) as thick as the line. */
export function ThicknessChip({
  id,
  label,
  px,
  on,
  onClick,
}: {
  id: string
  label: string
  px: number
  on: boolean
  onClick: () => void
}) {
  const dot = Math.min(22, Math.max(4, px * 1.4))
  return (
    <PillButton id={id} label={label} pressed={on} onClick={onClick}>
      <span
        aria-hidden
        className="rounded-full bg-current"
        style={{ width: dot, height: dot }}
      />
    </PillButton>
  )
}
