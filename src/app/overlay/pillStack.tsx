import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../tools/icons'
import { Card } from '../../design/parts/Card'
import { StatusPill } from '../../design/parts/StatusPill'
import { motionMs } from '../../design/parts/motion'
import { tp3 } from '../../design/parts/tp3'
import { usePhone } from '../../design/parts/useAnchoredCard'
import { pillStore } from './pillHooks'
import { usePillEnv, useShellPillEnv, type PillEnv } from './pillEnv'
import { arrangePills, iconOnly, pillBottom } from './pillLogic'
import { type PillEntry, type PillSpec, type PillStore } from './pillStore'
import { useVisualViewportBox } from './visualViewport'
import './stepLayers.css'
import '../../design/parts/StatusPill.css'

const useEntries = (store: PillStore) =>
  useSyncExternalStore(store.subscribe, store.entries, store.entries)
const useSaid = (store: PillStore) =>
  useSyncExternalStore(store.subscribe, store.said, store.said)

export interface PillStackProps {
  /** Draw these pills in place instead of reading the app store (gallery cells). */
  pills?: PillSpec[]
  /** `fixed` = the app corner; `inline` = drawn where it is (gallery). */
  mode?: 'fixed' | 'inline'
  /** Override what the stack must stay above (gallery). */
  env?: Partial<PillEnv>
  /** Force the phone look (gallery). */
  phone?: boolean
  /** false = ignore the shell's tab bar and toast (gallery drives its own env). */
  followShell?: boolean
  store?: PillStore
  'data-testid'?: string
}

/**
 * The status pill stack (S3-20 to S3-29): bottom corner at the end side, 8 px
 * gaps, pills in a fixed order, at most 4 then "+n", above the keyboard, tab
 * bar, toast and Tool frame footer. Gaps pass taps through to the page.
 */
export function PillStack(props: PillStackProps) {
  const { mode = 'fixed', store = pillStore } = props
  const live = useEntries(store)
  const said = useSaid(store)
  useShellPillEnv(mode === 'fixed' && props.followShell !== false)
  const appEnv = usePillEnv()
  const vv = useVisualViewportBox(mode === 'fixed')
  const phoneNow = usePhone()
  const phone = props.phone ?? phoneNow
  const [folded, setFolded] = useState<HTMLElement | null>(null)
  const refs = useRef(new Map<string, HTMLElement>())
  const tops = useRef(new Map<string, number>())

  const entries: PillEntry[] = props.pills
    ? props.pills.map((spec, i) => ({ spec, seq: i, leaving: false }))
    : live
  const { shown, rest } = arrangePills(
    entries.map((e) => ({ ...e, kind: e.spec.kind })),
  )
  const count = shown.length + (rest.length ? 1 : 0)
  const env: PillEnv = {
    ...appEnv,
    keyboard: Math.max(appEnv.keyboard, vv.keyboard),
    ...props.env,
  }
  const bottom = pillBottom(env)

  // The others slide to their place in 160 ms when one leaves (FLIP).
  useLayoutEffect(() => {
    const next = new Map<string, number>()
    refs.current.forEach((el, id) => {
      if (!el.isConnected) return
      const top = el.getBoundingClientRect().top
      next.set(id, top)
      const was = tops.current.get(id)
      const ms = motionMs(160)
      if (was !== undefined && ms > 0 && Math.abs(was - top) > 1)
        el.animate?.(
          [{ transform: `translateY(${was - top}px)` }, { transform: 'none' }],
          { duration: ms, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
        )
    })
    tops.current = next
  })

  // F6 reaches the stack (S3 keyboard rule).
  useEffect(() => {
    if (mode !== 'fixed') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F6') return
      const first = document.querySelector<HTMLElement>(
        '.pillstack[data-mode="fixed"] button',
      )
      if (!first) return
      e.preventDefault()
      first.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode])

  if (!entries.length && mode === 'fixed') return null

  const body = (
    <div
      className="pillstack"
      role="region"
      aria-label={tp3('parts.pill.region')}
      data-mode={mode}
      data-lift=""
      data-testid={props['data-testid'] ?? 'pillstack'}
      style={
        mode === 'fixed'
          ? ({ '--pill-bottom': `${bottom}px` } as React.CSSProperties)
          : { paddingBottom: bottom }
      }
    >
      {shown.map((e) => (
        <div
          key={e.spec.id}
          ref={(el) => {
            if (el) refs.current.set(e.spec.id, el)
            else refs.current.delete(e.spec.id)
          }}
          className="pill-slot"
        >
          <StatusPill
            spec={e.spec}
            leaving={e.leaving}
            iconOnly={iconOnly(e.spec.kind, count, phone)}
            onHold={(on) => store.hold(e.spec.id, on)}
            onDismiss={() => store.dismiss(e.spec.id)}
          />
        </div>
      ))}
      {rest.length ? (
        <div className="pill-slot">
          <div className="pill" data-kind="more" data-testid="pill-more">
            <button
              type="button"
              className="pill-main pill-more"
              aria-label={tp3('parts.pill.moreName', { count: rest.length })}
              aria-haspopup="dialog"
              aria-expanded={!!folded}
              data-testid="pill-more-button"
              onClick={(ev) => setFolded(folded ? null : ev.currentTarget)}
            >
              {tp3('parts.pill.more', { count: rest.length })}
            </button>
          </div>
        </div>
      ) : null}
      {folded && rest.length ? (
        <Card
          anchor={folded}
          size="pick"
          prefer="above"
          title={tp3('parts.pill.region')}
          onClose={() => setFolded(null)}
          testId="pill-more-card"
        >
          <div className="pill-fold">
            {rest.map((e) => (
              <button
                key={e.spec.id}
                type="button"
                className="pill-fold-item"
                onClick={(ev) => {
                  setFolded(null)
                  e.spec.onTap?.(ev.currentTarget)
                }}
              >
                <Icon name={e.spec.icon} size={18} />
                <span>{e.spec.label}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}
      {mode === 'fixed' ? (
        <>
          <span
            className="pill-sr"
            role="status"
            aria-live="polite"
            data-testid="pill-say"
          >
            {said.assertive ? '' : said.text}
          </span>
          <span className="pill-sr" role="alert" aria-live="assertive">
            {said.assertive ? said.text : ''}
          </span>
        </>
      ) : null}
    </div>
  )
  return mode === 'fixed' ? createPortal(body, document.body) : body
}

/** Mount once in the app; draws the stack from the app store. */
export function PillHost() {
  return <PillStack mode="fixed" />
}
