import { useEffect } from 'react'
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
    const onKey = (e: KeyboardEvent) => {
      if (typesIntoPage(e)) dispatchTuck({ type: 'write' })
    }
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (target?.closest?.(CHROME)) dispatchTuck({ type: 'tool' })
      else if (e.pointerType === 'pen') dispatchTuck({ type: 'write' })
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onDown, true)
    const off = v8Tool.subscribe(() => dispatchTuck({ type: 'tool' }))
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onDown, true)
      off()
    }
  }, [])
}
