import type { DropLineRect } from './useReorder'

/** The 3 px accent line with round end dots that shows where a dragged item lands. */
export function DropLine({ rect }: { rect: DropLineRect | null }) {
  if (!rect) return null
  return (
    <li
      role="presentation"
      className="rord-line"
      data-testid="drop-line"
      data-axis={rect.axis}
      aria-hidden="true"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.axis === 'y' ? rect.width : undefined,
        height: rect.axis === 'x' ? rect.height : undefined,
      }}
    />
  )
}
