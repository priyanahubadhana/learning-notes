import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useCardPick } from './cardPick'

/** A labelled group inside a card body. */
export function CardGroup({
  label,
  children,
}: {
  label?: string
  children: ReactNode
}) {
  return (
    <section className="pcard-group">
      {label && <h3 className="pcard-glabel">{label}</h3>}
      {children}
    </section>
  )
}

/** A well: rows separated by 1 px hairlines. */
export function CardWell({
  children,
  testId,
}: {
  children: ReactNode
  testId?: string
}) {
  return (
    <div className="pcard-well" data-testid={testId}>
      {children}
    </div>
  )
}

export function CardNote({ children }: { children: ReactNode }) {
  return <p className="pcard-note">{children}</p>
}

const ARROWS = [
  'ArrowRight',
  'ArrowDown',
  'ArrowLeft',
  'ArrowUp',
  'Home',
  'End',
]

/** A row of tiles: `radiogroup` (one choice) or `group` of checkboxes (many). */
export function TileGroup({
  label,
  multi,
  columns = 3,
  children,
}: {
  label: string
  multi?: boolean
  columns?: number
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Roving tabindex: the selected tile (or the first free one) is the tab stop.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const free = Array.from(
      el.querySelectorAll<HTMLElement>('.pcard-tile:not([disabled])'),
    )
    const stop =
      free.find((t) => t.getAttribute('aria-checked') === 'true') ?? free[0]
    el.querySelectorAll<HTMLElement>('.pcard-tile').forEach((t) => {
      t.tabIndex = t === stop ? 0 : -1
    })
  })
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!ARROWS.includes(e.key)) return
    const tiles = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(
        '.pcard-tile:not([disabled])',
      ),
    )
    const i = tiles.indexOf(document.activeElement as HTMLElement)
    if (!tiles.length || i < 0) return
    e.preventDefault()
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? tiles.length - 1
          : (i + step + tiles.length) % tiles.length
    tiles[next].focus()
  }
  return (
    <div
      ref={ref}
      className="pcard-tiles"
      role={multi ? 'group' : 'radiogroup'}
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      onKeyDown={onKey}
    >
      {children}
    </div>
  )
}

export type TileProps = {
  label: string
  selected?: boolean
  disabled?: boolean
  multi?: boolean
  onSelect?: () => void
  /** Pins hover or pressed (gallery cells). */
  force?: 'hover' | 'pressed'
  children?: ReactNode
  testId?: string
}

/** One choice in a TileGroup. */
export function Tile({
  label,
  selected,
  disabled,
  multi,
  onSelect,
  force,
  children,
  testId,
}: TileProps) {
  const pick = useCardPick()
  return (
    <button
      type="button"
      className="pcard-tile"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={!!selected}
      aria-label={label}
      disabled={disabled}
      data-force={force}
      data-selected={selected || undefined}
      data-testid={testId}
      onClick={() => {
        onSelect?.()
        pick()
      }}
    >
      <span className="pcard-tile-face" aria-hidden>
        {children}
      </span>
      <span className="pcard-tile-label">{label}</span>
    </button>
  )
}

/** A colour tile. */
export function Swatch({
  colour,
  ...rest
}: { colour: string } & Omit<TileProps, 'children'>) {
  return (
    <Tile {...rest}>
      <i className="pcard-swatch" style={{ background: colour }} />
    </Tile>
  )
}

/** A size tile: a letter drawn at that size. */
export function SizeTile({
  px,
  ...rest
}: { px: number } & Omit<TileProps, 'children'>) {
  return (
    <Tile {...rest}>
      <span style={{ fontSize: px, fontWeight: 600 }}>{'A'}</span>
    </Tile>
  )
}

/** A row with a switch on the right. */
export function SwitchRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className="pcard-row"
      onClick={() => onChange(!checked)}
    >
      <span>{label}</span>
      <span
        className="pcard-switch"
        aria-hidden
        data-on={checked || undefined}
      />
    </button>
  )
}
