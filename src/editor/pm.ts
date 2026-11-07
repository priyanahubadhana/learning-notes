/**
 * ProseMirror pieces the always-loaded bars need (selection and undo steps),
 * fetched in the background right after start instead of being part of the
 * first download. A page only has an editor once the editor library has
 * loaded, so by the time any of these is used the pieces are ready.
 */
type State = typeof import('prosemirror-state')
type History = typeof import('prosemirror-history')

let state: State | null = null
let history: History | null = null

void Promise.all([
  import('prosemirror-state'),
  import('prosemirror-history'),
]).then(([s, h]) => {
  state = s
  history = h
})

export function pmState(): State {
  if (!state) throw new Error('ProseMirror is still loading')
  return state
}

export function pmHistory(): History {
  if (!history) throw new Error('ProseMirror is still loading')
  return history
}
