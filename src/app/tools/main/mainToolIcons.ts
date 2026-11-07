import type { IconName } from '../icons'
import type { MainTool } from './mainTools'

/** The icon of each main-bar tool (the bar and the Edit toolbar sheet). */
export const TOOL_ICON: Record<MainTool, IconName> = {
  text: 'textSize',
  pen: 'penTool',
  highlighter: 'highlighter',
  eraser: 'eraser',
  newLine: 'newLine',
  backspace: 'backspace',
  lasso: 'lasso',
  insert: 'layoutGrid',
  read: 'bookOpen',
}
