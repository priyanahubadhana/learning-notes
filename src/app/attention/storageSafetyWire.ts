import { onStorageError } from '../errors'
import {
  currentBrowser,
  isSafariTab,
  storageProblem,
  type BrowserInfo,
} from '../../core/storageSafety'
import { isReadOnlyGate, subscribeReadOnlyGate } from '../../core/readOnlyGate'
import { getSignals, setSignals } from './attentionSignals'

/**
 * Storage safety at app start (flag storage.safety ON; loaded on demand).
 * Refused saves feed the one alerts spot; a Safari tab gets the Home Screen
 * notice. Only reads and counts; returns stop.
 */
export function startStorageSafety(
  browser: BrowserInfo = currentBrowser(),
): () => void {
  // SS-01: only for a signed-in person (the gate is on while signed out).
  const safari = isSafariTab(browser)
  const showNotice = () =>
    setSignals({ homeScreen: safari && !isReadOnlyGate() })
  showNotice()
  const unwatch = subscribeReadOnlyGate(showNotice)
  const stop = onStorageError((error) => {
    const problem = storageProblem(error)
    if (!problem) return false
    const s = getSignals()
    if (problem === 'full') setSignals({ storageFull: s.storageFull + 1 })
    else setSignals({ storageLost: s.storageLost + 1 })
    return true
  })
  return () => {
    stop()
    unwatch()
    setSignals({ homeScreen: false })
  }
}
