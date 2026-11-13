import { onRouted } from '../../app/input/eventRouter'

/**
 * Was the last thing the person did a key press? The focus ring shows for the
 * keyboard only: a part that moves focus into itself (a strip opened by a
 * right-click or a long-press) asks this first, because script focus after a
 * pointer inside a text editor would otherwise draw the ring.
 */
let lastWasKey = false
let listening = false

/** Listens through the app's event router, first in line, never handling. */
function listen() {
  if (listening) return
  listening = true
  const first = { priority: 2000, name: 'inputModality' }
  onRouted('keydown', () => void (lastWasKey = true), first)
  onRouted('pointerdown', () => void (lastWasKey = false), first)
}

export const lastInputWasKey = (): boolean => {
  listen()
  return lastWasKey
}
