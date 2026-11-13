import { useEffect } from 'react'
import { onRouted, PRIORITY } from '../../input/eventRouter'
import { v8Tool } from './barState'
import { dispatchTuck } from './useTuck'

const EDITABLE = '[contenteditable="true"], textarea, input'
const CHROME = '.v8, .pcard, [data-chrome]'

/** Is this key press text going into the page? */
function typesIntoPage(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  const target = e.target as Element | null
  if (!target?.closest?.(EDITABLE) || target.closest(CHROME)) return false
  return e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter'
}

/**
 * While the bar shows: writing (a key into the page, or the Pencil down on
 * the page) and tool use (a tap in the bar or its cards, or a new tool) feed
 * the BUG-003 rules. Mounted by the bar itself, so a hidden bar costs nothing.
 */
export function useTuckWatcher(): void {
  useEffect(() => {
    // Watch only (never "handled"), ahead of everyone else, like the ring watcher.
    const first = { priority: PRIORITY.gesture + 1, name: 'v8-tuck-watch' }
    const offKey = onRouted(
      'keydown',
      (e) => void (typesIntoPage(e) && dispatchTuck({ type: 'write' })),
      first,
    )
    const offDown = onRouted(
      'pointerdown',
      (e) => {
        const target = e.target as Element | null
        if (target?.closest?.(CHROME)) dispatchTuck({ type: 'tool' })
        else if (e.pointerType === 'pen') dispatchTuck({ type: 'write' })
      },
      first,
    )
    const offTool = v8Tool.subscribe(() => dispatchTuck({ type: 'tool' }))
    return () => {
      offKey()
      offDown()
      offTool()
    }
  }, [])
}
