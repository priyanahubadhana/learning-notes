import { useEffect, useRef, useState } from 'react'
import { Icon } from '../app/tools/icons'
import { t } from '../i18n/t'

/** How long the lock icon is held to unlock. */
export const UNLOCK_HOLD_MS = 1500
const RING = 2 * Math.PI * 18

/**
 * Reading lock (item 37, Netflix style): a clear layer over the book that
 * swallows taps, the Pencil and scrolling, so nothing opens or edits by
 * accident. A horizontal swipe still turns the page. The only way out is the
 * lock icon: hold it 1.5 s while a ring fills (Enter or Space held works too).
 */
export function ReadingLock({
  onUnlock,
  onSwipe,
}: {
  onUnlock: () => void
  onSwipe: (dir: 1 | -1) => void
}) {
  const [holding, setHolding] = useState(false)
  const timer = useRef(0)
  const down = useRef<{ x: number; y: number } | null>(null)
  const stop = () => {
    window.clearTimeout(timer.current)
    setHolding(false)
  }
  const start = () => {
    window.clearTimeout(timer.current)
    setHolding(true)
    timer.current = window.setTimeout(() => {
      setHolding(false)
      onUnlock()
    }, UNLOCK_HOLD_MS)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <>
      <div
        data-testid="reader-lock-layer"
        aria-hidden
        className="absolute inset-0 z-[25] touch-none"
        onPointerDown={(e) => {
          down.current = { x: e.clientX, y: e.clientY }
          e.preventDefault()
        }}
        onPointerUp={(e) => {
          const d = down.current
          down.current = null
          if (!d) return
          const dx = e.clientX - d.x
          if (
            Math.abs(dx) > 70 &&
            Math.abs(dx) > Math.abs(e.clientY - d.y) * 2
          ) {
            onSwipe(dx < 0 ? 1 : -1)
          }
        }}
        onWheel={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      />
      <button
        type="button"
        data-chrome
        data-testid="reader-unlock"
        aria-label={t('reader.lock.unlock')}
        onPointerDown={(e) => {
          e.preventDefault()
          start()
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start()
        }}
        onKeyUp={stop}
        onBlur={stop}
        className="fixed end-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[80] grid size-11 touch-none place-items-center rounded-full bg-bg/80 text-ink-soft shadow"
      >
        <svg
          width="44"
          height="44"
          viewBox="0 0 44 44"
          aria-hidden
          className="absolute inset-0 -rotate-90"
        >
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeDasharray={RING}
            strokeDashoffset={holding ? 0 : RING}
            style={{
              transition: holding
                ? `stroke-dashoffset ${UNLOCK_HOLD_MS}ms linear`
                : 'stroke-dashoffset 150ms',
            }}
          />
        </svg>
        <Icon name="lock" size={18} />
      </button>
      <p className="sr-only" role="status">
        {t('reader.lock.on')}
      </p>
    </>
  )
}
