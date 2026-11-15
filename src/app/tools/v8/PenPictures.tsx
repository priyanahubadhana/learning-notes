import { TYPE_LOOK, samplePath } from './cards/pen/penModel'
import { displayInk } from '../../../design/ink'
import type { PenTypeId } from './penFace'

/**
 * The two pen pictures of the Pen row (mock v9). Only design tokens and the
 * pen's own colour are used, so they read in light and dark.
 */

/** A small drawing of the pen for the Type chip, its band in the pen colour. */
export function PenPic({
  typeId,
  colour,
}: {
  typeId: PenTypeId
  colour: string
}) {
  // A marker and a highlighter wear their ink on the tip; the others are plain.
  const inked = typeId === 'marker' || typeId === 'highlighter'
  const tipEnd = typeId === 'brush' || typeId === 'marker' ? 27 : 28.5
  return (
    <svg
      className="v8penpic"
      width="22"
      height="30"
      viewBox="0 0 22 30"
      aria-hidden
    >
      <g transform="rotate(20 11 15)">
        <rect
          x="7"
          y="1"
          width="8"
          height="19"
          rx="2.5"
          fill="var(--color-neutral-fill)"
          stroke="var(--color-line-strong)"
          strokeWidth=".8"
        />
        <rect x="7" y="6" width="8" height="3" fill={colour} />
        <path
          d={`M7.3 20 L11 ${tipEnd} L14.7 20Z`}
          fill={inked ? colour : 'var(--color-line-strong)'}
          stroke="var(--color-line-strong)"
          strokeWidth=".6"
        />
      </g>
    </svg>
  )
}

/** A short sample stroke in the favourite's type and colour. */
export function FavPic({
  typeId,
  colour,
}: {
  typeId: PenTypeId
  colour: string
}) {
  const look = TYPE_LOOK[typeId]
  return (
    <span className="v8favwell" aria-hidden>
      <svg className="v8favpic" width="22" height="12" viewBox="0 0 22 12">
        <path
          d={samplePath(22, 12)}
          fill="none"
          style={{ stroke: displayInk(colour) }}
          strokeWidth={Math.max(1.5, look.w * 0.45)}
          strokeLinecap={look.cap}
          opacity={look.o}
        />
      </svg>
    </span>
  )
}
