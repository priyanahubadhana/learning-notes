import { lazy, Suspense, useSyncExternalStore } from 'react'
import { isLocked } from './lockedStatus'
import { getSyncStatus, subscribeSync } from './syncStatus'

const LockedAlert = lazy(() =>
  import('./LockedAlert').then((m) => ({ default: m.LockedAlert })),
)

/** Loads the "notebooks locked" pop-up and banner only while locked. */
export function LockedAlertGate() {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  if (!isLocked(status)) return null
  return (
    <Suspense fallback={null}>
      <LockedAlert />
    </Suspense>
  )
}
