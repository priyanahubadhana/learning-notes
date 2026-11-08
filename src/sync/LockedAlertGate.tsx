import { lazy, Suspense, useSyncExternalStore } from 'react'
import { onboardingGuide } from '../app/signInGuideState'
import { isLocked } from './lockedStatus'
import { getSyncStatus, subscribeSync } from './syncStatus'

const LockedAlert = lazy(() =>
  import('./LockedAlert').then((m) => ({ default: m.LockedAlert })),
)

/** Loads the "notebooks locked" pop-up and banner only while locked. */
export function LockedAlertGate() {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  const guide = onboardingGuide.useValue()
  // The first-run sign-in guide is already asking for the passphrase.
  if (!isLocked(status) || guide) return null
  return (
    <Suspense fallback={null}>
      <LockedAlert />
    </Suspense>
  )
}
