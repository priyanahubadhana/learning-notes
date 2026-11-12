import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import './OnOff.css'

export type OnOffProps = {
  checked: boolean
  onChange(next: boolean): void
  /** Screen-reader name (the setting's name). Required. */
  label: string
  disabled?: boolean
  /** Optional text drawn beside the switch. */
  children?: ReactNode
  testId?: string
  /** Id of the element that describes this switch. */
  describedBy?: string
}

/**
 * The shared On/Off switch (52 x 32 drawn, 44 pt hit). A real button with
 * `role="switch"`: Space and Enter toggle it, Left turns it off, Right on.
 * Colours and motion come from tokens; reduced motion turns the slide off.
 */
export function OnOff({
  checked,
  onChange,
  label,
  disabled,
  children,
  testId,
  describedBy,
}: OnOffProps) {
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (e.key === 'ArrowLeft' && checked) {
      e.preventDefault()
      onChange(false)
    } else if (e.key === 'ArrowRight' && !checked) {
      e.preventDefault()
      onChange(true)
    }
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      data-testid={testId}
      className="onoff"
      onClick={() => onChange(!checked)}
      onKeyDown={onKey}
    >
      <span className="onoff-track" aria-hidden>
        <span className="onoff-thumb" />
      </span>
      {children && <span className="onoff-text">{children}</span>}
    </button>
  )
}

export type OnOffChoiceProps<V extends string | number> = {
  options: readonly { value: V; label: string }[]
  value: V
  onChange(next: V): void
  /** Screen-reader name of the whole group. */
  label: string
  disabled?: boolean
  testId?: string
  /** Id of the element that describes this group. */
  describedBy?: string
}

/**
 * The segmented choice control (a few buttons, one chosen). Every button is
 * at least 44 pt tall. `role="radiogroup"`; arrow keys move and choose.
 */
export function OnOffChoice<V extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled,
  testId,
  describedBy,
}: OnOffChoiceProps<V>) {
  const group = useRef<HTMLDivElement>(null)
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0
    if (!step || options.length === 0) return
    e.preventDefault()
    const at = options.findIndex((o) => o.value === value)
    const to = (at + step + options.length) % options.length
    onChange(options[to]!.value)
    group.current?.querySelectorAll<HTMLElement>('[role="radio"]')[to]?.focus()
  }
  const known = options.some((o) => o.value === value)
  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label={label}
      aria-describedby={describedBy}
      aria-disabled={disabled || undefined}
      data-testid={testId}
      className="onoff-choice"
      onKeyDown={onKey}
    >
      {options.map((o, i) => {
        const on = o.value === value
        // Roving tab stop: the chosen button (or the first when none matches).
        const stop = on || (!known && i === 0)
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={stop ? 0 : -1}
            disabled={disabled}
            className="onoff-opt"
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
