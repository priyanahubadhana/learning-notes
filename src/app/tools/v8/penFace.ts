import { activeTool } from '../main/mainTools'
import {
  HIGHLIGHT_WIDTHS,
  highlighterSettings,
  penSettings,
  penWidth,
  type HighlighterSettings,
  type PenSettings,
  type PenType,
} from '../main/inkSettings'

/** The Pen tool's six types: five pens and the highlighter (TB-20). */
export type PenTypeId = PenType | 'highlighter'

export const TYPE_IDS: readonly PenTypeId[] = [
  'fountain',
  'ball',
  'brush',
  'pencil',
  'marker',
  'highlighter',
]

/** What the Pen chips show now. Read from the same stores as today's bar. */
export interface PenFace {
  typeId: PenTypeId
  size: 0 | 1 | 2
  colour: string
  /** Line width in px (the highlighter's own widths for the highlighter). */
  px: number
  /** True when an exact width replaces the three sizes (pens only). */
  exact: boolean
}

export const isHighlighter = (mode: string): boolean => mode === 'highlighter'

export function faceOf(
  mode: string,
  pen: PenSettings,
  hl: HighlighterSettings,
): PenFace {
  if (isHighlighter(mode))
    return {
      typeId: 'highlighter',
      size: hl.size,
      colour: hl.colour,
      px: HIGHLIGHT_WIDTHS[hl.size],
      exact: false,
    }
  return {
    typeId: pen.type,
    size: pen.size,
    colour: pen.colour,
    px: penWidth(pen),
    exact: pen.exact !== null,
  }
}

export function usePenFace(): PenFace {
  const mode = activeTool.useValue()
  return faceOf(mode, penSettings.useValue(), highlighterSettings.useValue())
}

/** Round dot size (px) for the Size chip. */
export const dotPx = (f: PenFace): number =>
  f.typeId === 'highlighter'
    ? Math.round(5 + f.px * 0.55)
    : Math.round(5 + f.px * 1.6)
