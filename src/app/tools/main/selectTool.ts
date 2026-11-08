import {
  activeTool,
  lastTool,
  openCard,
  openPillTool,
  pillPinned,
  shownPill,
  type MainTool,
  type ModeTool,
} from './mainTools'
import { changeSet, type BarSet } from '../toolbarState'

/** The old tool set a mode belongs to (the ribbon still follows it). */
export const setOfTool = (tool: ModeTool): BarSet =>
  tool === 'read' ? 'read' : tool === 'text' ? 'write' : 'draw'

/**
 * Selects a tool. A mode tool becomes the mode and opens its pill; Insert
 * only opens its pill; tapping the tool whose pill is already open closes
 * the pill (the tool stays selected; a pinned pill stays open). New line is
 * handled by its own button.
 */
export type SelectResult = 'opened' | 'closed'

export function selectTool(
  tool: Exclude<MainTool, 'newLine' | 'backspace'>,
): SelectResult {
  const pinned = pillPinned.get()
  const showing = shownPill(openPillTool.get(), pinned, activeTool.get())
  openCard.set(null)
  if (tool === 'insert') {
    if (showing === 'insert') {
      openPillTool.set(null)
      return 'closed'
    }
    openPillTool.set('insert')
    return 'opened'
  }
  const wasActive = activeTool.get() === tool
  activeTool.set(tool)
  // Keeps the ribbon's tab and Reading mode in step with the tool.
  changeSet(setOfTool(tool), 'user')
  if (wasActive && showing === tool) {
    openPillTool.set(pinned ? tool : null)
    return pinned ? 'opened' : 'closed'
  }
  // Reading mode has no pill (its tools are in the ribbon View tab and the ⋯ menu).
  if (tool === 'read') {
    openPillTool.set(null)
    return 'closed'
  }
  openPillTool.set(tool)
  return 'opened'
}

/**
 * ⇄ Last tool: goes back to the tool used before this one. Returns false
 * when there is none (the first tool of the visit).
 */
export function swapToLastTool(): boolean {
  const back = lastTool.get()
  if (!back || back === activeTool.get()) return false
  selectTool(back)
  return true
}

/** Opens a tool's pill without closing it when it is open already (hold). */
export function openToolPill(
  tool: Exclude<MainTool, 'newLine' | 'backspace'>,
): void {
  const showing = shownPill(
    openPillTool.get(),
    pillPinned.get(),
    activeTool.get(),
  )
  if (showing === tool && (tool === 'insert' || activeTool.get() === tool)) {
    return
  }
  selectTool(tool)
}
