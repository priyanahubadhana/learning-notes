import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UpgradeGate } from './app/UpgradeGate'
import { requestPersistentStorage } from './core/storage'

// Ask the browser not to clear our notes database (fire and forget).
void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UpgradeGate>
      <App />
    </UpgradeGate>
  </StrictMode>,
)
