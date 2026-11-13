import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { ScrollTrack } from './ScrollTrack'
import './PickerRow.css'

export interface PickerTileDef {
  id: string
  label: string
  /** A small leading picture (for "All"). */
  icon?: ReactNode
  /** A colour dot (a deck's colour). */
  dot?: string
}

export interface PickerRowProps {
  tiles: PickerTileDef[]
  value: string
  onPick: (id: string) => void
  /** Name of the group for screen readers. */
  label: string
  testId?: string
}

/**
 * N3 "pick on top": one sideways row of tiles ("All" first, then one per
 * item), a thin track when it scrolls, the picked tile scrolled into view.
 * A radiogroup: arrows move the pick; only the picked tile takes Tab.
 */
export function PickerRow({
  tiles,
  value,
  onPick,
  label,
  testId,
}: PickerRowProps) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    root.current
      ?.querySelector<HTMLElement>('[aria-checked="true"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [value])

  const move = (e: KeyboardEvent, i: number) => {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0
    if (!step || !tiles.length) return
    e.preventDefault()
    const next = tiles[(i + step + tiles.length) % tiles.length]
    onPick(next.id)
    const buttons =
      root.current?.querySelectorAll<HTMLElement>('[role="radio"]')
    buttons?.[(i + step + tiles.length) % tiles.length]?.focus()
  }

  return (
    <div ref={root} className="pickrow">
      <ScrollTrack
        className="pickrow__row"
        role="radiogroup"
        aria-label={label}
        data-testid={testId}
      >
        {tiles.map((tile, i) => (
          <button
            key={tile.id}
            type="button"
            role="radio"
            aria-checked={tile.id === value}
            tabIndex={tile.id === value ? 0 : -1}
            className="pickrow__tile"
            onClick={() => onPick(tile.id)}
            onKeyDown={(e) => move(e, i)}
          >
            {tile.icon && <span className="pickrow__ic">{tile.icon}</span>}
            {tile.dot && (
              <span
                className="pickrow__dot"
                style={{ background: tile.dot }}
                aria-hidden
              />
            )}
            <span className="pickrow__lbl">{tile.label}</span>
          </button>
        ))}
      </ScrollTrack>
    </div>
  )
}
