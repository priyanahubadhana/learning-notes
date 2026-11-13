import { onStorageError } from '../errors'
import {
  currentBrowser,
  isSafariTab,
  storageProblem,
  type BrowserInfo,
} from '../../core/storageSafety'
import { getSignals, setSignals } from './attentionSignals'

/**
 * Storage safety at app start (flag storage.safety ON; loaded on demand).
 * Refused saves feed the one alerts spot; a Safari tab gets the Home Screen
 * notice. Only reads and counts; returns stop.
 */
export function startStorageSafety(
  browser: BrowserInfo = currentBrowser(),
): () => void {
  setSignals({ homeScreen: isSafariTab(browser) })
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
    setSignals({ homeScreen: false })
  }
}
