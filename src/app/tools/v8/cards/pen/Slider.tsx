import { useId } from 'react'
import { Glow } from '../../Glow'

/**
 * One labelled slider with its value on the right. The shared parts have no
 * slider yet (reported); this is the single v8 one, used by every card.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  wedge,
  onChange,
  testId,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  /** Draws the track as a growing wedge (thickness). */
  wedge?: boolean
  onChange: (next: number) => void
  testId?: string
}) {
  const id = useId()
  const shown = Math.round(value * 10) / 10
  return (
    <Glow k={value} className="v8slider">
      <label htmlFor={id} className="v8slider-top">
        <span>{label}</span>
        <output htmlFor={id}>
          {shown}
          {unit}
        </output>
      </label>
      <input
        id={id}
        type="range"
        className="v8range"
        data-wedge={wedge || undefined}
        data-testid={testId}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Glow>
  )
}
