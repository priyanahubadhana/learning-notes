import type { JsonValue } from '../../../core/types'
import { tv } from '../tv'

/**
 * SET-B32 / B33: what Reduce glass does, drawn honestly on a colourful page
 * (as in the mock): one real frosted bar and one solid bar. Automatic splits
 * the stage: left frosted (device fast), right solid (device slow), plus a
 * plain line. Solid shows only a solid bar. The blur is the app's own.
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
        <i className="sv3-glass-dot sv3-glass-dot-1" />
        <i className="sv3-glass-dot sv3-glass-dot-2" />
        <i className="sv3-glass-dot sv3-glass-dot-3" />
        <span className="sv3-glass-line" />
        <span className="sv3-glass-line sv3-glass-line-s" />
        <div className="sv3-glass-bars">
          <span
            className="sv3-glass-bar"
            data-kind={solid ? 'solid' : 'frosted'}
          >
            {solid ? tv('sv3.glassSolid') : tv('sv3.glassFrosted')}
          </span>
          {!solid && (
            <span className="sv3-glass-bar" data-kind="solid">
              {tv('sv3.glassSolid')}
            </span>
          )}
        </div>
      </div>
      <span className="sv3-rowprev-text">
        {solid ? tv('sv3.glassSolidLine') : tv('sv3.glassAutoLine')}
      </span>
    </div>
  )
}
