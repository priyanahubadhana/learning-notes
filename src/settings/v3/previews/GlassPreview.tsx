import type { JsonValue } from '../../../core/types'
import { tv } from '../tv'

/**
 * SET-B32 / B33: what Reduce glass does, drawn honestly. Two small bars sit
 * over a striped page: one frosted (real blur), one solid. Automatic shows
 * both side by side (device fast / device slow) with a plain line; Solid shows
 * only solid bars. Nothing is distorted: the blur is the app's own.
 */
export function GlassPreview({ value }: { value: JsonValue }) {
  const solid = value === 'reduce'
  return (
    <div
      data-glass-preview
      data-mode={solid ? 'solid' : 'auto'}
      className="sv3-glass"
    >
      <div className="sv3-glass-stage" aria-hidden>
        <span className="sv3-glass-bar" data-kind={solid ? 'solid' : 'frosted'}>
          {solid ? tv('sv3.glassSolid') : tv('sv3.glassFrosted')}
        </span>
        {!solid && (
          <span className="sv3-glass-bar" data-kind="solid">
            {tv('sv3.glassSolid')}
          </span>
        )}
      </div>
      <span className="sv3-rowprev-text">
        {solid ? tv('sv3.glassSolidLine') : tv('sv3.glassAutoLine')}
      </span>
    </div>
  )
}
