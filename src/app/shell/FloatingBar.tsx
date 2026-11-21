import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { t } from '../../i18n/t'
import { MinimiseChip } from './MinimiseChip'
import {
  FIRST_PULSE_MS,
  minimiseBar,
  minimiseUsed,
  NEXT_PULSE_MS,
  PULSE_MS,
  restoreBar,
  useMinimised,
} from './minimise'
import { useTopLayer } from './useTopLayer'
import './shell-parts.css'

/** Nudges the minimise button after 45 s, then every 3 minutes, until it was used once. */
function usePulse(active: boolean): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!active) return
    let timer: ReturnType<typeof setTimeout>
    const schedule = (ms: number) => {
      timer = setTimeout(() => {
        setOn(true)
        timer = setTimeout(() => {
          setOn(false)
          schedule(NEXT_PULSE_MS)
        }, PULSE_MS)
      }, ms)
    }
    schedule(FIRST_PULSE_MS)
    return () => clearTimeout(timer)
  }, [active])
  return active && on
}

/**
 * SH-13: a glass pill at the bottom centre with a separator and a minimise
 * button at its end. Minimised, it turns into a chip (`label`, `icon`) that
 * restores it. Each bar remembers its own state.
 */
export function FloatingBar({
  id,
  label,
  icon,
  lift = 0,
  children,
}: {
  id: string
  label: string
  icon?: ReactNode
  /** Pixels to sit higher, when two bars show at once. */
  lift?: number
  children?: ReactNode
}) {
  const hidden = useMinimised(id)
  if (hidden)
    return (
      <MinimiseChip
        label={label}
        icon={icon}
        onRestore={() => restoreBar(id)}
      />
    )
  return (
    <Bar id={id} label={label} lift={lift}>
      {children}
    </Bar>
  )
}

function Bar({
  id,
  label,
  lift,
  children,
}: {
  id: string
  label: string
  lift: number
  children?: ReactNode
}) {
  const used = minimiseUsed.useValue()
  const pulse = usePulse(!used)
  const layer = useRef<HTMLDivElement | null>(null)
  useTopLayer(layer)
  return createPortal(
    <div ref={layer} popover="manual" className="sh-layer">
      <div
        role="toolbar"
        aria-label={label}
        className="sh-fbar"
        data-testid="floating-bar"
        data-bar={id}
        data-toast-avoid=""
        data-pulse={pulse ? '' : undefined}
        style={
          lift ? ({ '--fbar-lift': `${lift}px` } as CSSProperties) : undefined
        }
      >
        {children}
        <span className="sh-fbar-sep" aria-hidden="true" />
        <button
          type="button"
          className="sh-fbar-min"
          data-testid="bar-minimise"
          aria-label={t('shell.bar.minimise', { name: label })}
          onClick={() => minimiseBar(id)}
        >
          ⌄
        </button>
      </div>
    </div>,
    document.body,
  )
}
