/**
 * Was the last thing the person did a key press? The focus ring shows for the
 * keyboard only: a part that moves focus into itself (a strip opened by a
 * right-click or a long-press) asks this first, because script focus after a
 * pointer inside a text editor would otherwise draw the ring.
 */
let lastWasKey = false
let listening = false

function listen() {
  if (listening || typeof document === 'undefined') return
  listening = true
  document.addEventListener('keydown', () => (lastWasKey = true), true)
  document.addEventListener('pointerdown', () => (lastWasKey = false), true)
  document.addEventListener('contextmenu', () => (lastWasKey = false), true)
}
listen()

export const lastInputWasKey = (): boolean => lastWasKey
