import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { reloadOnFailedChunk } from './app/chunkReload'
import { ErrorBoundary } from './app/ErrorBoundary'
import { startNavHistory } from './app/navHistory'
import { UpgradeGate } from './app/UpgradeGate'
import { offerUpdate, repeatUpdateOffer, watchForUpdates } from './app/updates'
import { requestPersistentStorage } from './core/storage'
import { writePref } from './app/uiPrefs'
import { initDeviceMode } from './settings/deviceModeSettings'
import { saveEverything } from './share/saveEverything'

initDeviceMode()
startNavHistory()
reloadOnFailedChunk()

// Ask the browser not to clear our notes database (fire and forget).
void requestPersistentStorage()

// Keep the app on the device for offline use, and look for new versions at
// the start and whenever it comes to the front (an iPad rarely restarts it).
const update = registerSW({
  onNeedRefresh: () => offerUpdate(() => void update(true)),
  onRegisteredSW: (_url, registration) => {
    watchForUpdates(document, () => {
      repeatUpdateOffer()
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
