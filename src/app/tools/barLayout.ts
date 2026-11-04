import type { BarPlacement } from '../deviceMode'
import type { Place, RibbonMode, RibbonPlace } from './toolbarState'

/**
 * Which bars show and where. The short bar's position is the Settings
 * "Formatting bar position" (floating = the old "no bar"); the ribbon has its
 * own position ("same" = wherever the short bar is) and either replaces the
 * short bar or shows with it. Bars that share an edge are stacked in one
 * group, so two bars never overlap.
 */
export interface BarLayout {
  short: Place | null
  ribbon: Place | null
}

export function barLayout(
  shortPlacement: BarPlacement,
  ribbonOpen: boolean,
  mode: RibbonMode,
  ribbonPlace: RibbonPlace,
): BarLayout {
  // No tool bar at all (Show tool bar is off).
  if (shortPlacement === 'floating') return { short: null, ribbon: null }
  if (!ribbonOpen) return { short: shortPlacement, ribbon: null }
  const ribbon = ribbonPlace === 'same' ? shortPlacement : ribbonPlace
  return { short: mode === 'both' ? shortPlacement : null, ribbon }
}

export type BarKind = 'ribbon' | 'short'

/** The bars of each place, top to bottom (the ribbon above the short bar). */
export function barGroups(layout: BarLayout): Record<Place, BarKind[]> {
  const groups: Record<Place, BarKind[]> = { top: [], bottom: [], free: [] }
  if (layout.ribbon) groups[layout.ribbon].push('ribbon')
  if (layout.short) groups[layout.short].push('short')
  return groups
}
