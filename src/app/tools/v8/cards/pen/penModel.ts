import {
  HIGHLIGHT_COLOURS,
  PEN_COLOURS,
  customColours,
  eraserSettings,
  highlighterSettings,
  penSettings,
  type DrawAs,
} from '../../../main/inkSettings'
import { activeTool } from '../../../main/mainTools'
import { selectTool } from '../../../main/selectTool'
import { isUnlocked } from '../../../../../settings/level'
import type { ProFeatureId } from '../../../../../settings/proFeatures.gen'
import { isHighlighter, type PenTypeId } from '../../penFace'

/**
 * Logic of the Pen cards (1c). Every write goes to the stores today's bar
 * uses (`ink.pen`, `ink.highlighter`, `ink.customColours`, the active tool),
 * so the old and the new bar can never disagree.
 */

/** Three-word hint under each type tile (TB-20). */
export const TYPE_HINT = {
  fountain: 'v8.pen.hint.fountain',
  ball: 'v8.pen.hint.ball',
  brush: 'v8.pen.hint.brush',
  pencil: 'v8.pen.hint.pencil',
  marker: 'v8.pen.hint.marker',
  highlighter: 'v8.pen.hint.highlighter',
} as const satisfies Record<PenTypeId, string>

/** Sample stroke look per type: width, cap, opacity. */
export const TYPE_LOOK: Record<
  PenTypeId,
  { w: number; cap: 'round' | 'butt' | 'square'; o: number }
> = {
  fountain: { w: 3, cap: 'round', o: 1 },
  ball: { w: 2, cap: 'round', o: 1 },
  brush: { w: 6, cap: 'round', o: 1 },
  pencil: { w: 2.5, cap: 'round', o: 0.75 },
  marker: { w: 8, cap: 'butt', o: 1 },
  highlighter: { w: 12, cap: 'butt', o: 0.5 },
}

/** Picking a type: the pen's type and freehand drawing, or the highlighter. */
export function chooseType(id: PenTypeId): void {
  if (id === 'highlighter') {
    activeTool.set('highlighter')
    return
  }
  penSettings.update({ type: id, drawAs: 'free' })
  activeTool.set('pen')
}

export const chooseSize = (mode: string, i: 0 | 1 | 2): void => {
  if (isHighlighter(mode)) highlighterSettings.update({ size: i })
  else penSettings.update({ size: i, exact: null })
}

export const chooseColour = (mode: string, hex: string): void => {
  const lower = hex.toLowerCase()
  if (isHighlighter(mode)) highlighterSettings.update({ colour: lower })
  else penSettings.update({ colour: lower })
}

/** The six round swatches of the current tool (TB-23). */
export const swatchesFor = (mode: string) =>
  isHighlighter(mode) ? HIGHLIGHT_COLOURS : PEN_COLOURS

/** Custom colours that are not one of the six, newest first. */
export const extraColours = (): string[] => customColours.get()

/** Highlight eraser: the eraser, set to rub out highlights only. */
export function highlightEraser(): void {
  eraserSettings.update({ highlightsOnly: true })
  selectTool('eraser')
}

// ---- What each card shows, by level and unlock switch ----

export type FeelTab = 'feel' | 'aids' | 'math' | 'page'

/** Professional switch of each Feel section; none = always there. */
export const TAB_UNLOCK: Record<FeelTab, ProFeatureId | undefined> = {
  feel: undefined,
  aids: 'tb.penAids',
  math: undefined,
  page: undefined,
}

export const FEEL_TABS: readonly FeelTab[] = ['feel', 'aids', 'math', 'page']

export const feelTabs = (
  unlocked: (id: ProFeatureId) => boolean = isUnlocked,
): FeelTab[] =>
  FEEL_TABS.filter((t) => {
    const need = TAB_UNLOCK[t]
    return need === undefined || unlocked(need)
  })

/** Simple pickers close 190 ms after a pick; a card with more controls stays. */
export function cardAutoClose(
  id: string,
  unlocked: (id: ProFeatureId) => boolean = isUnlocked,
): boolean {
  if (id === 'pen.type') return true
  if (id === 'pen.size') return !unlocked('tb.penStroke')
  if (id === 'pen.colour') return !unlocked('tb.customColours')
  return false
}

export const isPenCard = (id: string): boolean => id.startsWith('pen.')

/** "Draw as" choices kept under Fine-tune (freehand, a clean shape, tape). */
export const DRAW_AS_CHOICES: readonly DrawAs[] = [
  'free',
  'line',
  'arrow',
  'rect',
  'ellipse',
  'triangle',
  'tape',
]

/** True when two hex colours are the same colour. */
export const sameColour = (a: string, b: string): boolean =>
  a.toLowerCase() === b.toLowerCase()

/** A wavy sample stroke, drawn in a w x h box. */
export function samplePath(w: number, h: number): string {
  const mid = h / 2
  const a = h * 0.28
  return `M ${w * 0.08} ${mid} C ${w * 0.25} ${mid - a}, ${w * 0.4} ${mid - a}, ${w * 0.5} ${mid} S ${w * 0.78} ${mid + a}, ${w * 0.92} ${mid}`
}
