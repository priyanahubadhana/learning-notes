/**
 * C10: while a card, a list or a resize drag has taken over, typing is paused
 * (see `src/paper/typingPause.ts`). The keyboard policy reads this so a key
 * never pulls the page's focus back into the text behind.
 */
let since = 0
/** A pause older than this is forgotten (a pause whose end never came). */
const STALE_MS = 120_000

export const setTypingPaused = (on: boolean) => {
  since = on ? Date.now() : 0
}
export const typingPaused = () => since > 0 && Date.now() - since < STALE_MS
