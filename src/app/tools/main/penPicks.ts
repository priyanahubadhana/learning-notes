import { useEffect } from 'react'
import { changeSet } from '../toolbarState'
import { activeTool, penPicksPen } from './mainTools'

/** Pure rule: should this touch pick the Pen tool? */
function shouldPickPen(
  pointerType: string,
  enabled: boolean,
  active: string,
  onBar: boolean,
): boolean {
  return enabled && pointerType === 'pen' && active === 'text' && !onBar
}

/**
 * Convenience (Settings › Tool bar › Pencil picks the Pen tool, off by
 * default): the Pencil touching the page selects the Pen tool. It never
 * changes what the Pencil does to text (penSelect.ts still only selects).
 */
export function usePenPicksPen(): void {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target
      const onBar =
        target instanceof Element &&
        target.closest('[data-bar], [data-pill-root]') !== null
      if (
        shouldPickPen(e.pointerType, penPicksPen.get(), activeTool.get(), onBar)
      ) {
        activeTool.set('pen')
        changeSet('draw', 'user')
      }
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [])
}
