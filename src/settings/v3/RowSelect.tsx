import { useState } from 'react'
import { Card, CardTrigger } from '../../design/parts/Card'
import { Tile, TileGroup } from '../../design/parts/CardParts'

/**
 * A row's long list of choices (more than 4): the shared ▾ that opens a pick
 * card, not a browser drop-down. Same card, tiles and keys as the rest of the app.
 */
export function RowSelect({
  label,
  value,
  options,
  onChange,
  describedBy,
}: {
  label: string
  value: string | number
  options: readonly { value: string | number; label: string }[]
  onChange(next: string | number): void
  describedBy?: string
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const current = options.find((o) => o.value === value)
  return (
    <>
      <CardTrigger
        open={!!anchor}
        label={label}
        describedBy={describedBy}
        className="sv3-select"
        onClick={(el) => setAnchor(anchor ? null : el)}
      >
        {current?.label}
      </CardTrigger>
      {anchor && (
        <Card
          anchor={anchor}
          size="pick"
          title={label}
          autoClose
          onClose={() => setAnchor(null)}
        >
          <TileGroup label={label} columns={3}>
            {options.map((o) => (
              <Tile
                key={String(o.value)}
                label={o.label}
                selected={o.value === value}
                onSelect={() => onChange(o.value)}
              />
            ))}
          </TileGroup>
        </Card>
      )}
    </>
  )
}
