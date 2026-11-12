import { keyTarget, type MoveKey } from './reorder'
import { tp } from '../tp'

/** ▲ ▼ for one row (44 pt each). The first ▲ and the last ▼ are disabled. */
export function MoveButtons({
  name,
  index,
  count,
  onMove,
  disabled,
}: {
  name: string
  index: number
  count: number
  onMove(key: MoveKey): void
  disabled?: boolean
}) {
  if (count < 2) return null
  const can = (k: MoveKey) => !disabled && keyTarget(index, count, k) !== -1
  return (
    <span className="rord-moves">
      <button
        type="button"
        className="rord-move"
        data-testid="move-up"
        aria-label={tp('parts.drag.up', { name })}
        disabled={!can('up')}
        onClick={() => onMove('up')}
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M2 8l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        className="rord-move"
        data-testid="move-down"
        aria-label={tp('parts.drag.down', { name })}
        disabled={!can('down')}
        onClick={() => onMove('down')}
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </span>
  )
}
