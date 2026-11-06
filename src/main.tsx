import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { reloadOnFailedChunk } from './app/chunkReload'
import { ErrorBoundary } from './app/ErrorBoundary'
import { startNavHistory } from './app/navHistory'
import { installPenTap } from './app/penTap'
import { UpgradeGate } from './app/UpgradeGate'
import {
  noteChecked,
  offerUpdate,
  repeatUpdateOffer,
  setUpdateChecker,
  watchForUpdates,
} from './app/updates'
import { requestPersistentStorage } from './core/storage'
import { writePref } from './app/uiPrefs'
import { initDeviceMode } from './settings/deviceModeSettings'
import { installScrollHints } from './app/scrollHints'
import { scrollHintsSetting } from './settings/builtinSettings'
import {
  readDeviceSetting,
  subscribeDeviceSettings,
} from './settings/settingsService'
import { saveEverything } from './share/saveEverything'

initDeviceMode()
startNavHistory()
reloadOnFailedChunk()
installPenTap()
{
  const hints = installScrollHints(
    () => readDeviceSetting(scrollHintsSetting) === 'on',
  )
  subscribeDeviceSettings(hints.refresh)
}

// The app scrolls inside its page scroller, never the document: if something
// (a focus, the keyboard's pan) moves the document, put it back.
window.addEventListener(
  'scroll',
  () => {
    if (document.querySelector('[data-app-shell]') && window.scrollY !== 0)
      window.scrollTo(0, 0)
  },
  { passive: true },
)
window.visualViewport?.addEventListener('resize', () => {
  if (window.scrollY !== 0) window.scrollTo(0, 0)
})

// Ask the browser not to clear our notes database (fire and forget).
void requestPersistentStorage()

// Keep the app on the device for offline use, and look for new versions at
// the start and whenever it comes to the front (an iPad rarely restarts it).
const update = registerSW({
  onNeedRefresh: () => offerUpdate(() => void update(true)),
  onRegisteredSW: (_url, registration) => {
    setUpdateChecker(async () => {
      await registration?.update()
    })
    watchForUpdates(document, () => {
      repeatUpdateOffer()
      noteChecked()
      void registration?.update().catch(() => {}) // offline: try next time
    })
  },
})

/** The way out of a whole-app failure: start again with nothing open. */
function goHome() {
  writePref('currentPage', null)
  writePref('currentNotebook', null)
  location.hash = ''
  location.reload()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary onHome={goHome} onSaveAll={saveEverything} fullScreen>
      <UpgradeGate>
        <App />
      </UpgradeGate>
    </ErrorBoundary>
  </StrictMode>,
)
