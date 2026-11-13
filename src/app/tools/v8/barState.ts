import { memStore, type Store } from '../store'
import { activeTool, isModeTool } from '../main/mainTools'
import { V8_TOOL_IDS, type V8ToolId } from './registryV8'
import { firstCardOf } from './rowItems'
import { enterShapes, leaveShapes } from './cards/shapes/shapesModel'

const isV8Tool = (v: string): v is V8ToolId =>
  (V8_TOOL_IDS as readonly string[]).includes(v)

/** The tool that is on now (it starts from today's mode where one exists). */
export const v8Tool: Store<V8ToolId> = memStore<V8ToolId>(
  modeToTool(activeTool.get()) ?? 'text',
)

/** An open card and the element it hangs from. */
export interface OpenCard {
  id: string
  anchor: HTMLElement
}

export interface BarState {
  tool: V8ToolId
  /** Id of the open card, or null. Never more than one (TB-05). */
  card: string | null
}

/**
 * A tap on a tool (TB-03, TB-04, TB-12). A new tool becomes active and shows
 * its row, nothing opens. The active tool again toggles its first card.
 * Insert is not a mode: a tap always toggles its card.
 */
export function tapTool(state: BarState, id: V8ToolId): BarState {
  if (id === 'insert')
    return { ...state, card: state.card === 'insert' ? null : 'insert' }
  if (id !== state.tool) return { tool: id, card: null }
  const card = firstCardOf(id)
  return { tool: id, card: state.card === card ? null : card }
}

/** Opens a card, or closes it when it is the one that is open (TB-05). */
export const toggleCard = (state: BarState, card: string): BarState => ({
  ...state,
  card: state.card === card ? null : card,
})

/** Makes the page follow the chosen tool (only the tools that are a mode). */
export function followMode(id: V8ToolId, from?: V8ToolId): void {
  // Shapes is the Pen drawing a clean shape; leaving it draws freehand again.
  if (from === 'shapes' && id !== 'shapes') leaveShapes()
  if (id === 'shapes') return enterShapes()
  // The highlighter is a type of the Pen tool: keep it when Pen is chosen.
  if (id === 'pen' && activeTool.get() === 'highlighter') return
  if (isModeTool(id)) activeTool.set(id)
}

/** Today's mode changed from elsewhere (the Pencil, a shortcut): follow it. */
export function modeToTool(mode: string): V8ToolId | null {
  if (mode === 'highlighter') return 'pen'
  return isV8Tool(mode) ? mode : null
}
