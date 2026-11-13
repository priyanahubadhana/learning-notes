import { useRef } from 'react'
import { Icon } from '../../app/tools/icons'
import type { PillSpec } from '../../app/overlay/pillStore'
import { tp3 } from './tp3'
import './StatusPill.css'

export interface StatusPillProps {
  spec: PillSpec
  /** Phone with 3 or more pills: only the icon shows; the label stays in aria-label. */
  iconOnly?: boolean
  leaving?: boolean
  /** Hover, focus or touch holds a timed pill. */
  onHold?(on: boolean): void
  onDismiss?(): void
  /** Gallery: draw a static state (pressed, hover, focus ring) for screenshots. */
  force?: 'hover' | 'pressed' | 'focus'
}

const R = 9
const C = 2 * Math.PI * R

/**
 * One status pill (S3-20): 36 px high inside a 44 pt target, glass card fill,
 * icon + label, an optional inline action (Stop) and cross. The stack
 * (src/app/overlay/pillStack.tsx) places it; nothing here positions anything.
 */
export function StatusPill(props: StatusPillProps) {
  const { spec, iconOnly, leaving, onHold, force } = props
  const mainRef = useRef<HTMLButtonElement | null>(null)
  const problem = spec.tone === 'problem'
  const recording = spec.kind === 'recording'
  const interactive = !!spec.onTap
  const dismissable = !!spec.dismissable && !recording
  const hold = (on: boolean) => () => onHold?.(on)
  return (
    <div
      className="pill"
      data-kind={spec.kind}
      data-tone={spec.tone ?? 'plain'}
      data-icon-only={iconOnly ? '' : undefined}
      data-leaving={leaving ? '' : undefined}
      data-force={force}
      data-testid={`pill-${spec.id}`}
      onPointerEnter={hold(true)}
      onPointerLeave={hold(false)}
      onFocusCapture={hold(true)}
      onBlurCapture={hold(false)}
      onTouchStart={hold(true)}
      onTouchEnd={hold(false)}
    >
      <button
        ref={mainRef}
        type="button"
        className="pill-main"
        data-testid={`pill-main-${spec.id}`}
        aria-label={spec.label}
        aria-haspopup={interactive ? 'dialog' : undefined}
        onClick={() => mainRef.current && spec.onTap?.(mainRef.current)}
      >
        <span className="pill-icon" aria-hidden="true">
          {recording ? <i className="pill-dot" /> : null}
          {!recording ? (
            <Icon name={problem ? 'circle' : spec.icon} size={16} />
          ) : null}
          {spec.progress !== undefined ? (
            <svg
              className="pill-ring"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <circle className="pill-ring-track" cx="12" cy="12" r={R} />
              <circle
                className="pill-ring-fill"
                cx="12"
                cy="12"
                r={R}
                strokeDasharray={C}
                strokeDashoffset={
                  C * (1 - Math.min(1, Math.max(0, spec.progress)))
                }
              />
            </svg>
          ) : null}
        </span>
        <span className="pill-label">{spec.label}</span>
      </button>
      {spec.action ? (
        <button
          type="button"
          className="pill-act"
          data-testid={`pill-action-${spec.id}`}
          aria-label={spec.action.label}
          onClick={spec.action.run}
        >
          <span className="pill-act-ring">
            <Icon name={spec.action.icon} size={14} />
          </span>
        </button>
      ) : null}
      {dismissable ? (
        <button
          type="button"
          className="pill-act"
          data-testid={`pill-x-${spec.id}`}
          aria-label={tp3('parts.pill.dismiss', { name: spec.label })}
          onClick={props.onDismiss}
        >
          <span className="pill-act-ring">
            <Icon name="close" size={14} />
          </span>
        </button>
      ) : null}
    </div>
  )
}
