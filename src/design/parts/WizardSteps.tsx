import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as RKeyboardEvent,
} from 'react'
import { Icon } from '../../app/tools/icons'
import { defaultCanGo, wizardProgress, type WizardStep } from './wizardLogic'
import { tp3 } from './tp3'
import './WizardSteps.css'

export type { WizardStep } from './wizardLogic'

export interface WizardStepsProps {
  /** 2 to 6 visible steps (the host removes locked Pro steps with `visibleSteps`). */
  steps: WizardStep[]
  value: string
  /** Default: any earlier step, and the next one when the current is valid. */
  canGo?(id: string): boolean
  /** Used by the default rule: is the current step valid? */
  valid?: boolean
  onChange(id: string): void
  /** Called when a step that is not allowed is pressed (the host shows its hint). */
  onBlocked?(id: string): void
  /** auto = compact when the strip does not fit, always at 640 px and below. */
  compact?: boolean | 'auto'
  'data-testid'?: string
}

const PHONE = 640

/**
 * Wizard steps (S3-13 to S3-19): one line of numbered steps that you can tap
 * to go back. It only shows where you are; the host's Next / Done button stays
 * the main way forward.
 */
export function WizardSteps(props: WizardStepsProps) {
  const { steps, value, onChange, onBlocked, compact = 'auto' } = props
  const idx = Math.max(
    0,
    steps.findIndex((s) => s.id === value),
  )
  const rootRef = useRef<HTMLElement | null>(null)
  const listRef = useRef<HTMLOListElement | null>(null)
  const fullW = useRef(0)
  const [auto, setAuto] = useState(false)
  const isCompact = compact === 'auto' ? auto : compact
  const labelKey = steps.map((s) => s.label).join('|')

  const allowed = (id: string) =>
    id === value ||
    (props.canGo
      ? props.canGo(id)
      : defaultCanGo(steps, value, id, props.valid ?? true))

  // Measure the full strip once (and again when the labels change); it is
  // compact when the box is narrower than that, or on a phone.
  useLayoutEffect(() => {
    if (compact !== 'auto') return
    const root = rootRef.current
    if (!root) return
    const fit = () => {
      if (listRef.current)
        fullW.current = listRef.current.scrollWidth + steps.length
      const narrow = window.innerWidth <= PHONE
      const w = root.clientWidth
      setAuto(narrow || (w > 0 && fullW.current > w))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(root)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, labelKey])

  // Announce a step change once (not on first show).
  const [said, setSaid] = useState('')
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setSaid(
      tp3('parts.wiz.stepOf', {
        n: idx + 1,
        total: steps.length,
        name: steps[idx]?.label ?? '',
      }),
    )
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (id: string) => {
    if (id === value) return
    if (allowed(id)) onChange(id)
    else onBlocked?.(id)
  }

  const onKey = (e: RKeyboardEvent<HTMLOListElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const step = (e.key === 'ArrowRight') !== rtl ? 1 : -1
    const btns = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
    )
    const at = btns.indexOf(document.activeElement as HTMLButtonElement)
    if (at < 0) return
    e.preventDefault()
    btns[Math.min(btns.length - 1, Math.max(0, at + step))]?.focus()
  }

  const nameOf = (s: WizardStep, ok: boolean) =>
    s.state === 'error'
      ? tp3('parts.wiz.needsFix', { name: s.label })
      : !ok
        ? tp3('parts.wiz.notYet', { name: s.label })
        : s.state === 'done' && s.id !== value
          ? tp3('parts.wiz.done', { name: s.label })
          : s.label

  const cur = steps[idx]
  const prev = steps[idx - 1]
  const next = steps[idx + 1]
  return (
    <nav
      ref={rootRef}
      className="wz"
      data-compact={isCompact ? '' : undefined}
      aria-label={tp3('parts.wiz.label')}
      data-testid={props['data-testid'] ?? 'wizard'}
    >
      {isCompact ? (
        <div className="wz-compact" data-testid="wizard-compact">
          <button
            type="button"
            className="wz-arrow"
            aria-label={tp3('parts.wiz.prev')}
            aria-disabled={prev ? undefined : 'true'}
            data-testid="wizard-prev"
            onClick={() => prev && go(prev.id)}
          >
            <Icon name="chevronLeft" size={18} />
          </button>
          <span className="wz-compact-text" aria-current="step">
            {tp3('parts.wiz.compact', {
              n: idx + 1,
              total: steps.length,
              name: cur?.label ?? '',
            })}
          </span>
          <button
            type="button"
            className="wz-arrow"
            aria-label={tp3('parts.wiz.next')}
            aria-disabled={next && allowed(next.id) ? undefined : 'true'}
            data-testid="wizard-next"
            onClick={() => next && go(next.id)}
          >
            <Icon name="chevronRight" size={18} />
          </button>
          <span className="wz-progress" aria-hidden="true">
            <span
              className="wz-progress-fill"
              style={{ width: `${wizardProgress(steps, value) * 100}%` }}
            />
          </span>
        </div>
      ) : null}
      <ol
        className="wz-list"
        ref={listRef}
        data-measure={isCompact ? '' : undefined}
        inert={isCompact}
        aria-hidden={isCompact ? 'true' : undefined}
        onKeyDown={onKey}
      >
        {steps.map((s, i) => {
          const ok = allowed(s.id)
          const current = s.id === value
          const done = i < idx || (s.state === 'done' && !current)
          return (
            <li key={s.id} className="wz-item">
              {i > 0 ? <span className="wz-line" aria-hidden="true" /> : null}
              <button
                type="button"
                className="wz-step"
                data-testid={`wizard-step-${s.id}`}
                data-state={
                  s.state === 'error'
                    ? 'error'
                    : current
                      ? 'current'
                      : done
                        ? 'done'
                        : 'upcoming'
                }
                aria-current={current ? 'step' : undefined}
                aria-disabled={ok ? undefined : 'true'}
                aria-label={nameOf(s, ok)}
                tabIndex={current ? 0 : -1}
                onClick={() => go(s.id)}
              >
                <span className="wz-circle" aria-hidden="true">
                  {s.state === 'error' ? (
                    '!'
                  ) : done ? (
                    <Icon name="check" size={14} className="wz-check" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="wz-label">{s.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
      <span className="wz-sr" role="status" aria-live="polite">
        {said}
      </span>
    </nav>
  )
}
