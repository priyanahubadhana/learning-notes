import { useEffect } from 'react'
import { onRouted, PRIORITY } from '../input/eventRouter'

/**
 * While `active`, Esc runs `close` (through the shared event router, after
 * menus and dialogs, which have a higher priority and take the key first).
 */
export function useEscape(active: boolean, close: () => void): void {
  useEffect(() => {
    if (!active) return
    return onRouted(
      'keydown',
      (e) => {
        if (e.key !== 'Escape') return
        close()
        return true
      },
      { priority: PRIORITY.normal, name: 'shell-columns' },
    )
  }, [active, close])
}
