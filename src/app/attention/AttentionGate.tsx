import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { LearningNotesDB } from '../../core/db'
import { useReadOnlyGate } from '../../core/useReadOnlyGate'
import { LockedAlertGate } from '../../sync/LockedAlertGate'
import { getSyncStatus, subscribeSync } from '../../sync/syncStatus'
import { browserSnooze, pickAttention } from './attentionLevel'
import { getSignals, subscribeSignals } from './attentionSignals'
import { useFlag } from '../flags'

const AttentionBanner = lazy(() =>
  import('./AttentionBanner').then((m) => ({ default: m.AttentionBanner })),
)

const StorageSafetyBanner = lazy(() =>
  import('./StorageSafetyBanner').then((m) => ({
    default: m.StorageSafetyBanner,
  })),
)
const SAFETY_CODES = new Set(['storageLost', 'storageFull', 'homeScreen'])

/** Flag storage.safety: start its watchers (loaded on demand). */
function useStorageSafety(on: boolean) {
  useEffect(() => {
    if (!on) return
    let stop: (() => void) | undefined
    let live = true
    void import('./storageSafetyWire').then((m) => {
      if (live) stop = m.startStorageSafety()
    })
    return () => {
      live = false
      stop?.()
    }
  }, [on])
}

/** Flag OFF: today exactly (SS-06). */
const SAFETY_OFF = { storageFull: 0, storageLost: 0, homeScreen: false }

const SESSION = Date.now()
const IDLE_MS = 2000

const typingIn = (el: Element | null) =>
  !!el &&
  (el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el as HTMLElement).isContentEditable)

/** True once the person has not typed for a moment (never pop in mid-word). */
function useQuiet(wanted: boolean): boolean {
  const [quiet, setQuiet] = useState(false)
  const lastKey = useRef(0)
  useEffect(() => {
    if (!wanted) return
    const onKey = () => (lastKey.current = Date.now())
    window.addEventListener('keydown', onKey, true)
    const idle = () =>
      !(
        typingIn(document.activeElement) &&
        Date.now() - lastKey.current < IDLE_MS
      )
    if (idle()) setQuiet(true)
    const timer = window.setInterval(() => idle() && setQuiet(true), 500)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.clearInterval(timer)
    }
  }, [wanted])
  return wanted && quiet
}

/**
 * The one spot for important alerts: the highest-level problem only, never
 * stacked. Level 1 hands over to the locked pop-up; levels 2 and 3 load the
 * banner file only when there is something to say.
 */
export function AttentionGate({ db }: { db: LearningNotesDB }) {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  const gated = useReadOnlyGate()
  const signals = useSyncExternalStore(subscribeSignals, getSignals)
  const safety = useFlag('storage.safety')
  useStorageSafety(safety)
  const [now, setNow] = useState(() => Date.now())
  const found = pickAttention(
    { status, ...signals, ...(safety ? {} : SAFETY_OFF) },
    browserSnooze(),
    now,
    SESSION,
  )
  const quiet = useQuiet(!!found && found.level > 1)
  // The sign-in bar (account gate) takes the one spot while the device is read-only.
  if (gated) return null
  if (found?.level === 1) return <LockedAlertGate />
  if (!found || !quiet) return null
  if (safety && SAFETY_CODES.has(found.code))
    return (
      <Suspense fallback={null}>
        <StorageSafetyBanner
          key={found.code}
          attention={found}
          session={SESSION}
          onDismissed={() => setNow(Date.now())}
        />
      </Suspense>
    )
  return (
    <Suspense fallback={null}>
      <AttentionBanner
        key={found.code}
        db={db}
        attention={found}
        session={SESSION}
        onDismissed={() => setNow(Date.now())}
      />
    </Suspense>
  )
}
