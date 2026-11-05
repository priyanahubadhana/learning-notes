import type { PillTool } from './mainTools'

/** The page a ‹ goes back to (undefined = this is a top page). */
export function parentPage(tool: PillTool, page: string): string | undefined {
  if (tool === 'text' && (page === 'font' || page === 'boxStyle'))
    return 'style'
  if (
    tool === 'pen' &&
    ['settings', 'gestures', 'stroke', 'colour', 'layers'].includes(page)
  ) {
    return 'main'
  }
  if (tool === 'highlighter' && (page === 'colour' || page === 'layers')) {
    return 'main'
  }
  if (tool === 'lasso' && page === 'layers') return 'main'
  return undefined
}
