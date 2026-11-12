import {
  bookAloudState,
  pauseBookAloud,
  resumeBookAloud,
  startBookAloud,
} from '../aloud/bookAloud'

/**
 * Listen button (RD-B10). Slice 7b fills this in (hold = settings card,
 * highlight of the spoken passage). Until then a tap does what today's
 * read-aloud does: start, pause, resume.
 */
export function toggleListen(): void {
  const s = bookAloudState.get()
  if (s === 'playing') pauseBookAloud()
  else if (s === 'paused') resumeBookAloud()
  else void startBookAloud()
}
