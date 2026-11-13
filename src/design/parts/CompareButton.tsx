import { useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Icon } from '../../app/tools/icons'
import { tp3 } from './tp3'
import './CompareButton.css'

/** A press shorter than this latches "Before" on (S3-31). */
export const HOLD_TAP_MS = 300

export interface CompareButtonProps {
  /** Called with true while the original should show, false when it should not. */
  onShow(on: boolean): void
  /** Why there is nothing to compare; the button is disabled and says it (S3-32). */
  disabledReason?: string
  label?: string
  /** Time source for the short-tap rule (tests). */
  now?: () => number
  'data-testid'?: string
}

/**
 * The Before / after button in hold mode (S3-30, S3-31): hold = see the
 * original while pressed; a short tap or Space / Enter keeps "Before" until the
 * next tap. Icon + word on wide screens, icon only on a phone.
 */
export function CompareButton(props: CompareButtonProps) {
  const { onShow, disabledReason, now = () => Date.now() } = props
  const [held, setHeld] = useState(false)
  const [latched, setLatched] = useState(false)
  const [said, setSaid] = useState('')
  const down = useRef<number | null>(null)
  const wasLatched = useRef(false)
  const on = held || latched
  const set = (next: boolean, nextLatched: boolean, nextHeld: boolean) => {
    setLatched(nextLatched)
    setHeld(nextHeld)
    onShow(next)
    setSaid(
      next ? tp3('parts.cmp.showingBefore') : tp3('parts.cmp.showingAfter'),
    )
  }

  const pd = (e: RPointerEvent<HTMLButtonElement>) => {
    if (disabledReason || e.button > 0) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // no capture for a synthetic pointer
    }
    down.current = now()
    wasLatched.current = latched
    if (!latched) set(true, false, true)
  }
  const end = () => {
    const t0 = down.current
    down.current = null
    if (t0 === null) return
    if (wasLatched.current) {
      // a tap while latched switches it off
      set(false, false, false)
    } else if (now() - t0 < HOLD_TAP_MS) {
      setHeld(false)
      setLatched(true) // stays on "Before" until the next tap
    } else {
      set(false, false, false)
    }
  }

  const name = tp3('parts.cmp.buttonName')
  return (
    <>
      <button
        type="button"
        className="cmpb"
        data-testid={props['data-testid'] ?? 'compare-button'}
        aria-label={name}
        aria-pressed={on}
        aria-disabled={disabledReason ? 'true' : undefined}
        aria-describedby={disabledReason ? 'cmpb-why' : undefined}

        data-on={on ? '' : undefined}
        onPointerDown={pd}
        onPointerUp={end}
        onPointerCancel={end}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key !== ' ' && e.key !== 'Enter') return
          e.preventDefault()
          if (e.repeat || disabledReason) return
          set(!latched, !latched, false)
        }}
      >
        <Icon name="layers" size={18} />
        <span className="cmpb-word">
          {props.label ?? tp3('parts.cmp.button')}
        </span>
      </button>
      {disabledReason ? (
        <span id="cmpb-why" className="cmpb-sr">
          {disabledReason}
        </span>
      ) : null}
      <span className="cmpb-sr" role="status" aria-live="polite">
        {said}
      </span>
    </>
  )
}
