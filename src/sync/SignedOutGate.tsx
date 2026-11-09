import { lazy, Suspense, useSyncExternalStore } from 'react'
import { getSyncStatus, subscribeSync } from './syncStatus'

const SignedOutLock = lazy(() =>
  import('./SignedOutLock').then((m) => ({ default: m.SignedOutLock })),
)
const SyncChoiceDialog = lazy(() =>
  import('./SyncChoiceDialog').then((m) => ({ default: m.SyncChoiceDialog })),
)

/**
 * Loads the full-screen "You were signed out" lock (remote sign-out) or the
 * "changes on both sides" choice only while one is needed. Devices that were
 * never signed in, or use the app without an account, never load either.
 */
export function SignedOutGate() {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  if (status.endedRemotely && status.phase === 'signedOut')
    return (
      <Suspense fallback={null}>
        <SignedOutLock />
      </Suspense>
    )
  if (status.choice)
    return (
      <Suspense fallback={null}>
        <SyncChoiceDialog counts={status.choice} />
      </Suspense>
    )
  return null
}
