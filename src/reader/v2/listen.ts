import {
  bookAloudState,
  pauseBookAloud,
  resumeBookAloud,
  setBookStopAtEnd,
  startBookAloud,
  stopBookAloud,
} from '../aloud/bookAloud'
import { memStore } from '../../app/tools/store'

/**
 * Listen button (RD-B10): a tap reads aloud at once, then pauses and resumes.
 * The hold (settings only) lives in ReaderBarRow and ListenCard.
 */
export function toggleListen(): void {
  const s = bookAloudState.get()
  if (s === 'playing') pauseBookAloud()
  else if (s === 'paused') resumeBookAloud()
  else void startBookAloud()
}

/** Minutes left on the Listen sleep timer, or null. 'page' = stop at the end of this page. */
export type SleepChoice = 'off' | 'page' | 10 | 20 | 30 | 60
export const SLEEP_CHOICES: readonly SleepChoice[] = [
  'off',
  'page',
  10,
  20,
  30,
  60,
]
export const sleepChoice = memStore<SleepChoice>('off')
let timer: ReturnType<typeof setTimeout> | null = null

export function setListenSleep(choice: SleepChoice): void {
  if (timer) clearTimeout(timer)
  timer = null
  setBookStopAtEnd(choice === 'page')
  sleepChoice.set(choice)
  if (typeof choice === 'number') {
    timer = setTimeout(() => {
      timer = null
      sleepChoice.set('off')
      stopBookAloud()
    }, choice * 60_000)
  }
}
