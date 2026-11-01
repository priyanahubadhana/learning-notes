/**
 * A new version of the app has been downloaded and waits for the user's OK.
 * The offer is repeated whenever the app comes back to the front, because a
 * message can be missed and an iPad may keep the app open for weeks.
 */
type Listener = (apply: () => void) => void

let pending: (() => void) | undefined
let listener: Listener | undefined

/** Called once the new version is ready; `apply` restarts into it. */
export function offerUpdate(apply: () => void) {
  pending = apply
  listener?.(apply)
}

/** Listens for offers, including one made before the app had started. */
export function onUpdateOffer(next: Listener): () => void {
  listener = next
  if (pending) next(pending)
  return () => {
    if (listener === next) listener = undefined
  }
}

/** Repeats a waiting offer. */
export function repeatUpdateOffer() {
  if (pending) listener?.(pending)
}

/** Back to no offer and no listener (for tests). */
export function resetUpdates() {
  pending = undefined
  listener = undefined
}
