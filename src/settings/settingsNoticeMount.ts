import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { SettingsNotice } from './settingsNotice'

/** Puts the notice on the page (its own small tree, outside the app). */
export function mountSettingsNotice(): void {
  if (document.getElementById('settings-notice-host')) return
  const host = document.createElement('div')
  host.id = 'settings-notice-host'
  document.body.appendChild(host)
  createRoot(host).render(createElement(SettingsNotice))
}
