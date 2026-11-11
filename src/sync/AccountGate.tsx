import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'
import { onSignInRequired } from '../app/errors'
import { isReadOnlyGate, subscribeReadOnlyGate } from '../core/readOnlyGate'
import { refreshGate } from './gateRule'
import { getSyncStatus, subscribeSync } from './syncStatus'

const AccountGateBar = lazy(() =>
  import('./AccountGateBar').then((m) => ({ default: m.AccountGateBar })),
)

/**
 * Owner decision Q3a: a device with no sign-in is read-only. This tiny eager
 * part keeps the switch right when the sign-in changes (sync status) and
 * loads the banner and the sign-in sheet only while the gate is on. Signed-in
 * people never download either.
 */
export function AccountGate() {
  const gated = useSyncExternalStore(subscribeReadOnlyGate, isReadOnlyGate)
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  const [sheet, setSheet] = useState(false)

  // Sign in or out in this window changes the stored session: look again.
  useEffect(() => {
    refreshGate()
  }, [status.phase, status.email])

  // An edit that was refused opens the sign-in sheet (nothing is lost).
  useEffect(() => onSignInRequired(() => setSheet(true)), [])

  // "You were signed out" already covers the screen and asks to sign in.
  if (!gated || (status.endedRemotely && status.phase === 'signedOut'))
    return null
  return (
    <Suspense fallback={null}>
      <AccountGateBar
        sheet={sheet && gated}
        onOpen={() => setSheet(true)}
        onClose={() => setSheet(false)}
      />
    </Suspense>
  )
}
