import { penSettings, type PenType } from '../app/tools/main/inkSettings'
import { openCard, type PillTool } from '../app/tools/main/mainTools'
import { selectTool } from '../app/tools/main/selectTool'
import { inkApi } from './inkRuntime'
import { toggleMagnifier, toggleRuler } from './toolState'

/**
 * What the ribbon's Draw tab (and Search all features) does with the ink
 * tools: choose the tool and its pen type, open the card that holds a
 * setting, or set the paper. Everything else works through the main bar.
 */

const PEN_TOOLS: Record<string, PenType> = {
  ballPen: 'ball',
  fountainPen: 'fountain',
  marker: 'marker',
  brush: 'brush',
  pencil: 'pencil',
}

const PAPER: Record<string, 'lined' | 'grid' | 'dots' | undefined> = {
  paperBlank: undefined,
  paperLined: 'lined',
  paperGrid: 'grid',
  paperDots: 'dots',
}

/** The card a setting tool opens: [tool, page]. */
const CARDS: Record<string, [PillTool, string]> = {
  drawColor: ['pen', 'colour'],
  thickness: ['pen', 'stroke'],
  opacity: ['highlighter', 'main'],
  pressure: ['pen', 'main'],
  smoothing: ['pen', 'main'],
  taperedEnds: ['pen', 'main'],
  inkLayers: ['pen', 'layers'],
}

/** Ids of the tools in this file (the registry points them here). */
export const INK_TOOL_IDS: readonly string[] = [
  ...Object.keys(PEN_TOOLS),
  ...Object.keys(PAPER),
  ...Object.keys(CARDS),
  'pen',
  'highlighter',
  'eraser',
  'lasso',
  'onlyPencil',
  'shapes',
  'tape',
  'ruler',
  'magnifier',
]

export function runInkTool(id: string): void {
  if (id in PEN_TOOLS) {
    // Choosing a pen means writing again, not drawing shapes or tape.
    penSettings.update({ type: PEN_TOOLS[id], drawAs: 'free' })
    selectTool('pen')
  } else if (id === 'shapes') {
    // The Pen draws a clean shape by dragging; the card shows which one.
    const now = penSettings.get().drawAs
    penSettings.update({
      drawAs: now === 'free' || now === 'tape' ? 'rect' : now,
    })
    selectTool('pen')
    openCard.set({ tool: 'pen', page: 'main' })
  } else if (id === 'tape') {
    penSettings.update({ drawAs: 'tape' })
    selectTool('pen')
  } else if (id === 'ruler') {
    toggleRuler()
  } else if (id === 'magnifier') {
    toggleMagnifier()
  } else if (
    id === 'pen' ||
    id === 'highlighter' ||
    id === 'eraser' ||
    id === 'lasso'
  ) {
    selectTool(id)
  } else if (id in CARDS) {
    const [tool, page] = CARDS[id]
    selectTool(tool)
    openCard.set({ tool, page })
  } else if (id in PAPER) {
    inkApi()?.setPaper(PAPER[id])
  } else if (id === 'onlyPencil') {
    const off = penSettings.get().finger === 'off'
    penSettings.update({ finger: off ? 'auto' : 'off' })
  }
}
