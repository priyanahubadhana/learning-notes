import { t } from '../../i18n/t'

/**
 * Time left in the chapter and the book (C5), from this device's own
 * measured reading speed (words per minute); 220 until enough reading has
 * been measured. Pure maths plus one small stored number.
 */

export const DEFAULT_WPM = 220
const MIN_WPM = 60
const MAX_WPM = 900
const KEY = 'learning-notes:readerWpm'

interface Stored {
  wpm: number
  /** How many samples were folded in (the average settles after ten). */
  n: number
}

function read(): Stored | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null
    return raw &&
      Number.isFinite(raw.wpm) &&
      raw.wpm >= MIN_WPM &&
      raw.wpm <= MAX_WPM
      ? raw
      : null
  } catch {
    return null
  }
}

/** The reader's speed: the measured average, else 220. */
export const readingWpm = (): number => read()?.wpm ?? DEFAULT_WPM

/** Folds one measurement into the rolling average (a slow drift, not a jump). */
export function recordSpeed(wpm: number): void {
  if (!Number.isFinite(wpm) || wpm < MIN_WPM || wpm > MAX_WPM) return
  const old = read()
  const n = Math.min(10, (old?.n ?? 0) + 1)
  const next = old ? old.wpm + (wpm - old.wpm) / n : wpm
  try {
    localStorage.setItem(KEY, JSON.stringify({ wpm: Math.round(next), n }))
  } catch {
    // Storage blocked: the default speed stays.
  }
}

/** Whole minutes to read `words` at `wpm` (at least 1 while anything is left). */
export const minutesFor = (words: number, wpm: number): number =>
  words <= 0 ? 0 : Math.max(1, Math.round(words / wpm))

/** "5 min", "1 h 20 min", "under 1 min". */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return t('reader.left.none')
  if (minutes < 60) return t('reader.left.min', { min: minutes })
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0
    ? t('reader.left.hours', { h })
    : t('reader.left.hoursMin', { h, min: m })
}

/** Words per foliate "size unit" (1,600 characters of markup per unit, about 0.09 words per character). */
export const WORDS_PER_UNIT = 1600 * 0.09

/**
 * Turns reading progress into a measured speed. Feed it every position; it
 * returns a words-per-minute sample only for steady reading: forward by a
 * small step, between 3 seconds and 3 minutes apart. Jumps (Contents, Page
 * Flip) and pauses give nothing.
 */
export class SpeedTracker {
  private last: { progress: number; at: number } | null = null
  private words: number

  constructor(totalWords: number) {
    this.words = totalWords
  }

  setTotal(totalWords: number): void {
    this.words = totalWords
  }

  update(progress: number, now: number): number | null {
    const prev = this.last
    this.last = { progress, at: now }
    if (!prev || this.words <= 0) return null
    const dMs = now - prev.at
    const dWords = (progress - prev.progress) * this.words
    if (dMs < 3_000 || dMs > 180_000) return null
    if (dWords <= 0 || dWords > this.words * 0.05) return null
    const wpm = dWords / (dMs / 60_000)
    return wpm >= MIN_WPM && wpm <= MAX_WPM ? wpm : null
  }

  /** A jump: forget where reading was. */
  reset(): void {
    this.last = null
  }
}
