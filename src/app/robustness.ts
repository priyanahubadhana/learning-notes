import { installHealthCheck, onHealthRun, setStuckHandler } from './healthCheck'
import { requestSoftRefresh } from './softRefresh'
import { installToolsDebug } from './toolsDebug'
import { throttled } from './updates'

/**
 * The parts of the tools-robustness work that are not needed for the first
 * paint (the health check, the soft refresh, the console hook). main.tsx loads
 * this after start, when the browser is idle, so the first download stays
 * small. The input machine, the edit lock and the listener count are loaded
 * at once: the gestures use them from the first touch.
 */
export function startRobustness(lookQuietly: () => void): void {
  installToolsDebug()
  void import('./updateChannel') // listen for another window's update
  installHealthCheck()
  // A heal that fails twice within a minute: refresh the app (at a safe moment,
  // at most once every 10 minutes), the last resort.
  setStuckHandler((why) => void requestSoftRefresh(why))
  // When the app comes back or has been idle, also read the settings again and
  // look for a new version (at most once per 2 minutes).
  const lookSoon = throttled(lookQuietly)
  onHealthRun(() => {
    lookSoon()
    void import('../settings/settingsMirror')
      .then((m) => m.rereadSettings())
      .catch(() => {})
  })
}
