import { tp } from '../textMisc'
import type { TagEntry, TriState } from './tagSearch'

/** One tag line: tri-state check, #name, its path (muted) and its use count. */
export function TagRow({
  tag,
  id,
  state,
  active,
  dim,
  indent = 0,
  showPath = true,
  onToggle,
}: {
  tag: TagEntry
  id: string
  state: TriState
  active: boolean
  dim?: boolean
  indent?: number
  showPath?: boolean
  onToggle(): void
}) {
  const parents = tag.path.slice(0, -1)
  return (
    <div
      id={id}
      role="option"
      aria-selected={state !== 'none'}
      aria-checked={state === 'some' ? 'mixed' : state === 'all'}
      aria-label={`#${tag.name}`}
      data-testid={`tag-row-${tag.id}`}
      data-state={state}
      data-active={active}
      data-dim={dim ? 'true' : undefined}
      title={dim ? tp('parts.tags.dimmed') : undefined}
      className="pm-row"
      style={indent ? { paddingLeft: 8 + indent * 20 } : undefined}
      onClick={onToggle}
    >
      <span className="pm-check" data-state={state} aria-hidden>
        {state === 'all' ? '✓' : state === 'some' ? '–' : ''}
      </span>
      <span className="pm-row__main">
        <span className="pm-row__name">#{tag.name}</span>
        {showPath && parents.length > 0 && (
          <span className="pm-row__path">{tag.path.join(' › ')}</span>
        )}
      </span>
      <span className="pm-row__count">{tag.count}</span>
    </div>
  )
}
