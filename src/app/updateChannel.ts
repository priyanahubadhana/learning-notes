import { rememberPlace } from './autoUpdate'
import { penIsDown } from './palmGuard'
import { hasUnsaved } from './saveStatus'
import { reloadWhenSafe } from './updates'

/**
 * Several open windows (items 16, 24): the window that applies an update says
 * so, and the others restart with it at a safe moment, so none is left on the
 * old version or blocks the new worker.
 */
const channel =
  typeof BroadcastChannel === 'undefined'
    ? null
    : new BroadcastChannel('ln-update')

export function announceApply(): void {
  channel?.postMessage('apply')
}

channel?.addEventListener('message', (e) => {
  if (e.data !== 'apply') return
  setTimeout(
    () =>
      reloadWhenSafe(
        () =>
          document.visibilityState !== 'visible' ||
          (!penIsDown() && !hasUnsaved()),
        () => {
          rememberPlace()
          location.reload()
        },
      ),
    1500,
  )
})
