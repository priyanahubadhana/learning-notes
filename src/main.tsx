import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { startNavHistory } from './app/navHistory'
import { UpgradeGate } from './app/UpgradeGate'
import { offerUpdate, repeatUpdateOffer, watchForUpdates } from './app/updates'
import { requestPersistentStorage } from './core/storage'

startNavHistory()

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UpgradeGate>
      <App />
    </UpgradeGate>
  </StrictMode>,
)
