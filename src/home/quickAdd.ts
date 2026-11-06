import { addDays, nextWeekday } from '../core/homeDays'

/**
 * Quick add (F1): one line, with an optional day word at the start or the
 * end: "Call Sam tomorrow", "mon Read chapter 3", "hoy comprar pan". The word
 * is removed from the title. Words exist in English, Hindi and Spanish; a
 * word in the middle of a sentence is left alone.
 */

const WEEKDAYS: Record<string, number> = {
  // English (0 = Sunday)
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
  // Spanish
  domingo: 0,
  lunes: 1,
  martes: 2,
  miércoles: 3,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
  sabado: 6,
  // Hindi
  रविवार: 0,
  सोमवार: 1,
  मंगलवार: 2,
  बुधवार: 3,
  गुरुवार: 4,
  शुक्रवार: 5,
  शनिवार: 6,
}

const TODAY = new Set(['today', 'hoy', 'आज'])
/** "कल" can mean yesterday too; for a to-do it is read as tomorrow. */
const TOMORROW = new Set(['tomorrow', 'tmrw', 'tmr', 'mañana', 'manana', 'कल'])

export interface QuickAdd {
  title: string
  plannedDay?: string
}

/** The day a single word names, or null. */
function dayOfWord(word: string, today: string): string | null {
  const w = word.toLowerCase()
  if (TODAY.has(w)) return today
  if (TOMORROW.has(w)) return addDays(today, 1)
  const weekday = WEEKDAYS[w]
  return weekday === undefined ? null : nextWeekday(today, weekday)
}

export function parseQuickAdd(text: string, today: string): QuickAdd {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return { title: '' }
  // Never leave an empty title: the word alone stays a title.
  if (words.length > 1) {
    const last = dayOfWord(words[words.length - 1], today)
    if (last) return { title: words.slice(0, -1).join(' '), plannedDay: last }
    const first = dayOfWord(words[0], today)
    if (first) return { title: words.slice(1).join(' '), plannedDay: first }
  }
  return { title: words.join(' ') }
}
