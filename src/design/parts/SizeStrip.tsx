import { useState } from 'react'
import { t } from '../../i18n/t'
import {
  SIZE_MAX,
  SIZE_MIN,
  SLIDER_MAX,
  clampSize,
  stepSize,
} from './sizeModel'
import './sizeStrip.css'

/**
 * The one size control (box bar part A and B): a number, a slider and − / +
 * (one step). Any number between the limits. The box bar's Size strip and the
 * Text tool's size control are this same part, so they look and work the same.
 */
export function SizeStrip({
  value,
  onSet,
}: {
  value: number
  onSet: (px: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft === null) return
    const n = Number(draft)
    setDraft(null)
    if (draft.trim() !== '' && Number.isFinite(n)) onSet(clampSize(n))
  }
  return (
    <div className="ss" data-size-strip>
      <input
        type="number"
        inputMode="numeric"
        className="ss-num"
        aria-label={t('onebar.size.number')}
        min={SIZE_MIN}
        max={SIZE_MAX}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
      />
      <input
        type="range"
        className="ss-slider"
        aria-label={t('onebar.size.slider')}
        min={SIZE_MIN}
        max={SLIDER_MAX}
        step={1}
        value={Math.min(SLIDER_MAX, value)}
        onChange={(e) => onSet(clampSize(Number(e.target.value)))}
      />
      <span className="ss-step">
        <button
          type="button"
          className="ss-b"
          aria-label={t('onebar.size.smaller')}
          disabled={value <= SIZE_MIN}
          onClick={() => onSet(stepSize(value, -1))}
        >
          −
        </button>
        <button
          type="button"
          className="ss-b"
          aria-label={t('onebar.size.larger')}
          disabled={value >= SIZE_MAX}
          onClick={() => onSet(stepSize(value, 1))}
        >
          +
        </button>
      </span>
    </div>
  )
}
