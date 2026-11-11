import { useSyncExternalStore } from 'react'
import { isReadOnlyGate, subscribeReadOnlyGate } from './readOnlyGate'

/** True while this device must sign in before editing; re-renders on change. */
export const useReadOnlyGate = (): boolean =>
  useSyncExternalStore(subscribeReadOnlyGate, isReadOnlyGate)
