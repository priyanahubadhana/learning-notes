import { t } from '../../../i18n/t'
import {
  HIGHLIGHT_WIDTHS,
  PREVIEW_SIZE,
  highlighterPreview,
  highlighterSettings,
  penPreview,
  penSettings,
} from './inkSettings'

/**
 * A live stroke that follows the settings (colour, thickness, sharpness,
 * pressure, stabilisation, flatness, line style). It shows what the pen will
 * do before the drawing engine (step 3) is on the page.
 */
export function InkPreview({ kind }: { kind: 'pen' | 'highlighter' }) {
  const pen = penSettings.useValue()
  const h = highlighterSettings.useValue()
  const stroke = kind === 'pen' ? penPreview(pen) : highlighterPreview(h)
  const colour = kind === 'pen' ? pen.colour : h.colour
  return (
    <svg
      role="img"
      aria-label={t('ink.preview.label')}
      data-ink-preview={kind}
      viewBox={`0 0 ${PREVIEW_SIZE.width} ${PREVIEW_SIZE.height}`}
      className="h-14 w-full rounded-lg border border-line bg-white"
    >
      <path
        d={stroke.d}
        fill={stroke.fill === 'none' ? 'none' : colour}
        stroke={stroke.stroke ? colour : 'none'}
        strokeWidth={stroke.stroke?.width}
        strokeDasharray={stroke.stroke?.dash}
        strokeLinecap={stroke.stroke?.cap}
        opacity={stroke.opacity}
        data-width={
          kind === 'highlighter' ? HIGHLIGHT_WIDTHS[h.size] : undefined
        }
      />
    </svg>
  )
}
