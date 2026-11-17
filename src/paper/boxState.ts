/**
 * Box states (bug batch 2, item 8; text-tool-plan 5b; the owner saw this in
 * GoodNotes). One state per page:
 *
 * - idle: nothing picked; a box shows only its own style.
 * - selected: the box's frame was tapped (finger or Pencil); floating Box bar,
 *   handles and an accent frame.
 * - typing: the caret is inside a picked box (with text box v2: inside any
 *   box, `fresh` when it was never picked); the bar hides and only a thin
 *   outline stays. Tapping the frame again goes back to selected (the caret
 *   position is kept by the editor); tapping inside resumes typing.
 *
 * A pure reducer, so every transition is unit-tested; `PaperFrame` feeds it
 * from the frame bands (tap), the editors' focus and Escape.
 */

export type BoxState =
  | { kind: 'idle' }
  | { kind: 'selected'; ids: string[] }
  | {
      kind: 'typing'
      id: string
      /**
       * Text box v2 (C11): the caret went into a box that was not picked (a
       * box just made, a tap in the page's first box). It looks like typing
       * (thin border, no dots, no bar) but it was never selected, so the
       * caret leaving it selects nothing, and a Text-tool tap on paper makes
       * the next box at once (TB-06, C27).
       */
      fresh?: true
    }

export type BoxEvent =
  /** A tap on a box's frame or grip (Shift/Cmd adds to the selection). */
  | { type: 'frameTap'; id: string; add?: boolean }
  /** The caret went into a box's text (a tap inside, or a new box). */
  | {
      type: 'caretIn'
      id: string
      /** Text box v2 (C16): typing here unselects every other box. */
      exclusive?: boolean
    }
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
      // Text box v2 (C11, C16): the caret in any box is typing there (thin
      // border, no dots, no bar); every other box is unselected. A box that
      // was picked goes back to selected when the caret leaves; one that was
      // never picked is typed in "fresh" and goes back to nothing.
      if (e.exclusive)
        return state.kind === 'selected' &&
          state.ids.length === 1 &&
          state.ids[0] === e.id
          ? { kind: 'typing', id: e.id }
          : { kind: 'typing', id: e.id, fresh: true }
      // Without v2: typing in a box that is not picked is plain typing (idle): the bar
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
      if (state.kind !== 'typing' || (e.id !== undefined && state.id !== e.id))
        return state
      return state.fresh ? IDLE : { kind: 'selected', ids: [state.id] }
    case 'clear':
      return IDLE
    case 'pick':
      return e.ids.length ? { kind: 'selected', ids: e.ids } : IDLE
  }
}

/** The ids that count as picked in a state. */
export const pickedOf = (s: BoxState): string[] =>
  s.kind === 'selected' ? s.ids : s.kind === 'typing' && !s.fresh ? [s.id] : []
