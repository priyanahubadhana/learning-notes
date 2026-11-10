/**
 * Box states (bug batch 2, item 8; text-tool-plan 5b; the owner saw this in
 * GoodNotes). One state per page:
 *
 * - idle: nothing picked; a box shows only its own style.
 * - selected: the box's frame was tapped (finger or Pencil); floating Box bar,
 *   handles and an accent frame.
 * - typing: the caret is inside a picked box; the bar hides and only a thin
 *   outline stays. Tapping the frame again goes back to selected (the caret
 *   position is kept by the editor); tapping inside resumes typing.
 *
 * A pure reducer, so every transition is unit-tested; `PaperFrame` feeds it
 * from the frame bands (tap), the editors' focus and Escape.
 */

export type BoxState =
  | { kind: 'idle' }
  | { kind: 'selected'; ids: string[] }
  | { kind: 'typing'; id: string }

export type BoxEvent =
  /** A tap on a box's frame or grip (Shift/Cmd adds to the selection). */
  | { type: 'frameTap'; id: string; add?: boolean }
  /** The caret went into a box's text (a tap inside, or a new box). */
  | { type: 'caretIn'; id: string }
  /** The caret left the box's text (focus moved elsewhere). */
  | { type: 'caretOut'; id?: string }
  /** A tap on bare paper, or Escape. */
  | { type: 'clear' }
  /** The Lasso picked these boxes. */
  | { type: 'pick'; ids: string[] }

export const IDLE: BoxState = { kind: 'idle' }

export function boxReducer(state: BoxState, e: BoxEvent): BoxState {
  switch (e.type) {
    case 'frameTap': {
      if (e.add && state.kind === 'selected') {
        const ids = state.ids.includes(e.id)
          ? state.ids.filter((x) => x !== e.id)
          : [...state.ids, e.id]
        return ids.length ? { kind: 'selected', ids } : IDLE
      }
      return { kind: 'selected', ids: [e.id] }
    }
    case 'caretIn':
      // Already typing here: the same state (no redraw of the whole paper).
      if (state.kind === 'typing' && state.id === e.id) return state
      // Typing in a box that is not picked is plain typing (idle): the bar
      // and handles belong to a picked box.
      if (
        (state.kind === 'selected' &&
          state.ids.length === 1 &&
          state.ids[0] === e.id) ||
        (state.kind === 'typing' && state.id === e.id)
      )
        return { kind: 'typing', id: e.id }
      return state
    case 'caretOut':
      return state.kind === 'typing' &&
        (e.id === undefined || state.id === e.id)
        ? { kind: 'selected', ids: [state.id] }
        : state
    case 'clear':
      return IDLE
    case 'pick':
      return e.ids.length ? { kind: 'selected', ids: e.ids } : IDLE
  }
}

/** The ids that count as picked in a state. */
export const pickedOf = (s: BoxState): string[] =>
  s.kind === 'selected' ? s.ids : s.kind === 'typing' ? [s.id] : []
