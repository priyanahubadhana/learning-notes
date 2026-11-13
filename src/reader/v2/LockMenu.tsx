import { useContext, useEffect, useRef, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { Icon, type IconName } from '../../app/tools/icons'
import { Card } from '../../design/parts/Card'
import { CardGroup, CardWell } from '../../design/parts/CardParts'
import { t, type MessageKey } from '../../i18n/t'
import { UNLOCK_HOLD_MS } from '../ReadingLock'
import { isStrong, lockNudge, visibleModes, type LockMode } from './lockModes'

type Rect = { left: number; top: number; width: number; height: number }

const RING = 2 * Math.PI * 20

const ICON: Record<LockMode, IconName> = {
  all: 'lockOpen',
  reading: 'bookOpen',
  view: 'eye',
  frozen: 'lock',
}

const modeLabel = (m: LockMode) => t(`readerv2.lock.${m}` as MessageKey)

/** Hangs the menu under the padlock AND the whole bar, so it never covers the bar. */
function anchorFor(el: Element): Rect {
  const r = el.getBoundingClientRect()
  // Below the whole bar stack: the pen bar under the reader bar sits in the
  // top layer, so a menu that opened over it could not be tapped (gate 2).
  const bar = (
    el.closest('.rv2-stack') ?? el.closest('.rv2-bar')
  )?.getBoundingClientRect()
  return {
    left: r.left,
    top: r.top,
    width: r.width,
    height: Math.max(r.height, (bar?.bottom ?? r.bottom) - r.top),
  }
}

/**
 * The padlock of the reader bar (slice 7d). In Everything works and Reading
 * mode a tap opens the menu of modes (RD-B15). In View only, a press-and-hold
 * fills a ring over 1.5 s and then opens the lock (RD-B19); letting go early
 * drains the ring and keeps the lock (RD-B20). Frozen has its own layer
 * (ReadingLock) because the bar is hidden then.
 */
export default function LockButton({
  mode,
  menuOpen,
  onMenu,
  onUnlock,
}: {
  mode: LockMode
  menuOpen: boolean
  onMenu: (anchor: Rect | null) => void
  onUnlock: () => void
}) {
  const { toast } = useContext(AppUiContext)
  const [holding, setHolding] = useState(false)
  const [shaking, setShaking] = useState(false)
  const timer = useRef(0)
  const strong = isStrong(mode)

  // Tools that were turned away shake the padlock for a moment.
  const nudge = lockNudge.useValue()
  const seen = useRef(nudge)
  useEffect(() => {
    if (nudge === seen.current) return
    seen.current = nudge
    setShaking(true)
    const id = window.setTimeout(() => setShaking(false), 260)
    return () => window.clearTimeout(id)
  }, [nudge])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const start = () => {
    if (!strong || holding) return
    window.clearTimeout(timer.current)
    setHolding(true)
    timer.current = window.setTimeout(() => {
      timer.current = 0
      setHolding(false)
      onUnlock()
    }, UNLOCK_HOLD_MS)
  }
  // Let go (or leave, or cancel) before the ring is full: the lock stays.
  const early = () => {
    if (!holding) return
    window.clearTimeout(timer.current)
    timer.current = 0
    setHolding(false)
    toast(t('readerv2.lock.holdHint'))
  }

  return (
    <>
      <button
        type="button"
        className="rv2-btn rv2-lock"
        data-testid="reader-lock"
        data-mode={mode}
        data-holding={holding || undefined}
        data-shake={shaking || undefined}
        data-pressed={mode !== 'all' || undefined}
        aria-label={t('readerv2.lock.label', { mode: modeLabel(mode) })}
        aria-haspopup={strong ? undefined : 'menu'}
        aria-expanded={strong ? undefined : menuOpen}
        onPointerDown={(e) => {
          if (!strong) return
          e.preventDefault()
          start()
        }}
        onPointerUp={early}
        onPointerLeave={early}
        onPointerCancel={early}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (strong && (e.key === 'Enter' || e.key === ' ') && !e.repeat) {
            e.preventDefault()
            start()
          }
        }}
        onKeyUp={early}
        onBlur={early}
        onClick={(e) => {
          if (strong) return
          onMenu(menuOpen ? null : anchorFor(e.currentTarget))
        }}
      >
        <svg
          className="rv2-lock__ring"
          viewBox="0 0 44 44"
          aria-hidden="true"
          width="44"
          height="44"
        >
          <circle
            cx="22"
            cy="22"
            r="20"
            fill="none"
            strokeDasharray={RING}
            strokeDashoffset={holding ? 0 : RING}
            style={{
              transition: holding
                ? `stroke-dashoffset ${UNLOCK_HOLD_MS}ms linear`
                : 'stroke-dashoffset 150ms',
            }}
          />
        </svg>
        <Icon name={ICON[mode]} size={18} />
      </button>
      {holding && (
        <span className="sr-only" role="status">
          {t('readerv2.lock.holding')}
        </span>
      )}
    </>
  )
}

/** The menu of modes (RD-B15): Frozen only when its Professional switch is on. */
export function LockMenuCard({
  anchor,
  mode,
  frozenOn,
  onPick,
  onClose,
}: {
  anchor: Rect
  mode: LockMode
  frozenOn: boolean
  onPick: (m: LockMode) => void
  onClose: () => void
}) {
  return (
    <Card
      anchor={anchor}
      size="panel"
      title={t('readerv2.lock.title')}
      onClose={onClose}
      testId="rv2-lock-menu"
    >
      <CardGroup>
        <CardWell>
          {visibleModes(frozenOn).map((m) => (
            <button
              key={m}
              type="button"
              role="menuitemradio"
              aria-checked={mode === m}
              className="pcard-row rv2-lock-row"
              data-testid={`rv2-lock-${m}`}
              onClick={() => onPick(m)}
            >
              <Icon name={ICON[m]} size={18} />
              <span className="rv2-lock-row__text">
                <b>{modeLabel(m)}</b>
                <small>{t(`readerv2.lock.${m}Hint` as MessageKey)}</small>
              </span>
              {mode === m && <Icon name="check" size={18} />}
            </button>
          ))}
        </CardWell>
      </CardGroup>
      <p className="pcard-note">
        {t(frozenOn ? 'readerv2.lock.note' : 'readerv2.lock.noteBasic')}
      </p>
    </Card>
  )
}
