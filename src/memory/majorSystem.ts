import type { LearningNotesDB } from '../core/db'

/**
 * Major system helper (E2): every digit stands for consonant sounds, and
 * words made from those sounds (vowels are free) become pictures of numbers.
 * English only; the word list is small and built in. Your own picks are kept
 * in the `settings` table under `memory.majorPicks`.
 */

/** The sounds of each digit, as shown in "How to use". */
export const DIGIT_SOUNDS: readonly string[] = [
  's, z',
  't, d',
  'n',
  'm',
  'r',
  'l',
  'j, sh, ch',
  'k, g (hard)',
  'f, v',
  'p, b',
]

/** Built-in word ideas (a few hundred common, easy-to-picture nouns). */
const WORDS =
  'sea zoo ice sue toe tie tea day dye hen nun nose no knee note nine name ' +
  'home mom ma me aim mouse moon mine row rye ray ear air oar rain rice rose ' +
  'law lie low eel ale owl lime lamp leaf wheel shoe show chew jaw joy ash ' +
  'cow key gay ink egg cake coat cat cave cap fee fan foe off ivy five ' +
  'fox fire fish pie bee bay boy pea bow ape pen pin bone bean bus base ' +
  'sun sin sit sad seat soda suit sand set seed snow snake snail sky soap ' +
  'town tent tree toy tin tan tank tire tool tube tape tub dog door dive ' +
  'dam doom dime dome duck dish date dial dirt drum deer dad net nut nail ' +
  'neck needle nurse nap knife mat meat mud mail map mop mug moth mask ' +
  'mule mint mayor rat rod rug rope rock road robe ring rim ram rake ' +
  'roof rib rabbit lid lad lot light lamb lip lake leg lock lace lion lily ' +
  'cup chair chin chain cheese cheek chop jam jet jug jar jail juice ' +
  'case cook cage gun gum gate goat gold car cart cord card kite kid king ' +
  'fat food foot fed fort fork fall film fig fog fur vase vine vest van ' +
  'pad pot pit pet paint pearl peach pool pole pill pig pug ' +
  'bat bed bud bird boat bell ball bag bike bark book bear beer bib baby ' +
  'tomato tulip teacher tunnel domino dragon dolphin doctor dancer ' +
  'camera camel candle carpet castle cabin coffee guitar garden ghost ' +
  'magic mirror mother monkey monster marble medal melon mountain muscle ' +
  'nature napkin notebook number noodle ' +
  'pencil pillow planet pocket pepper pirate pizza puzzle pumpkin piano ' +
  'bottle bucket butter button basket balloon banana bridge bubble ' +
  'lemon letter ladder lizard lobster lawyer leopard ' +
  'radio rocket river robot ribbon ' +
  'sofa soldier spider spoon star stone storm stove sugar summer swan ' +
  'wallet window witch wolf worm yarn yoga yogurt zebra zipper'

/**
 * Digits for a word, from its spelling (approximate: it follows sounds for
 * the common cases, not the dictionary). Vowels, h, w, y are ignored;
 * doubled letters count once; a silent b after m is dropped.
 */
export function wordDigits(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  let out = ''
  let i = 0
  while (i < w.length) {
    const c = w[i]
    const two = w.slice(i, i + 2)
    const next = w[i + 1] ?? ''
    // The same letter twice in a row (tt, ll, ss) is one sound.
    if (c === next && 'bcdfgklmnprstz'.includes(c)) {
      i++
    } else if (two === 'sh' || two === 'ch') {
      out += '6'
      i += 2
    } else if (two === 'th') {
      out += '1'
      i += 2
    } else if (two === 'ph') {
      out += '8'
      i += 2
    } else if (two === 'ck') {
      out += '7'
      i += 2
    } else if (two === 'gh') {
      i += 2
    } else if (c === 'k' && next === 'n' && i === 0) {
      i++ // silent k in "knife"
    } else if (c === 'm' && next === 'b' && i + 2 >= w.length) {
      out += '3'
      i += 2 // "lamb"
    } else if ('sz'.includes(c)) {
      out += '0'
      i++
    } else if ('td'.includes(c)) {
      out += '1'
      i++
    } else if (c === 'n') {
      out += '2'
      i++
    } else if (c === 'm') {
      out += '3'
      i++
    } else if (c === 'r') {
      out += '4'
      i++
    } else if (c === 'l') {
      out += '5'
      i++
    } else if (c === 'j') {
      out += '6'
      i++
    } else if (c === 'g') {
      out += 'eiy'.includes(next) ? '6' : '7'
      i++
    } else if (c === 'c') {
      out += 'eiy'.includes(next) ? '0' : '7'
      i++
    } else if (c === 'k' || c === 'q') {
      out += '7'
      i++
    } else if (c === 'x') {
      out += '70'
      i++
    } else if ('fv'.includes(c)) {
      out += '8'
      i++
    } else if ('pb'.includes(c)) {
      out += '9'
      i++
    } else {
      i++ // vowels, h, w, y
    }
  }
  return out
}

let index: Map<string, string[]> | null = null
/** Built-in words by their digits. */
function builtIn(): Map<string, string[]> {
  if (index) return index
  index = new Map()
  for (const word of new Set(WORDS.split(' '))) {
    const digits = wordDigits(word)
    if (!digits) continue
    const list = index.get(digits) ?? []
    list.push(word)
    index.set(digits, list)
  }
  return index
}

/** Word ideas for a digit string: your picks first, then built-in words. */
export function wordsFor(
  digits: string,
  picks: Record<string, string[]> = {},
  limit = 8,
): string[] {
  return [
    ...new Set([...(picks[digits] ?? []), ...(builtIn().get(digits) ?? [])]),
  ].slice(0, limit)
}

/**
 * Splits a number into pieces that have words: the longest piece (up to 3
 * digits) with at least one idea, else a single digit.
 */
export function splitNumber(
  digits: string,
  picks: Record<string, string[]> = {},
): { digits: string; words: string[] }[] {
  const clean = digits.replace(/\D/g, '').slice(0, 30)
  const pieces: { digits: string; words: string[] }[] = []
  let at = 0
  while (at < clean.length) {
    let size = Math.min(3, clean.length - at)
    while (
      size > 1 &&
      wordsFor(clean.slice(at, at + size), picks).length === 0
    ) {
      size--
    }
    const piece = clean.slice(at, at + size)
    pieces.push({ digits: piece, words: wordsFor(piece, picks) })
    at += size
  }
  return pieces
}

const PICKS_ID = 'memory.majorPicks'
const isPicks = (v: unknown): v is Record<string, string[]> =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.values(v).every(
    (x) => Array.isArray(x) && x.every((s) => typeof s === 'string'),
  )

/** Your saved picks (digits → words). */
export async function getPicks(
  db: LearningNotesDB,
): Promise<Record<string, string[]>> {
  const row = await db.settings.get(PICKS_ID)
  return row && isPicks(row.value) ? row.value : {}
}

/** Saves your own word for a digit string (newest first, at most 5). */
export async function savePick(
  db: LearningNotesDB,
  digits: string,
  word: string,
  now: number = Date.now(),
): Promise<void> {
  const clean = digits.replace(/\D/g, '').slice(0, 30)
  const w = word.trim().slice(0, 40)
  if (!clean || !w) return
  const picks = await getPicks(db)
  picks[clean] = [w, ...(picks[clean] ?? []).filter((x) => x !== w)].slice(0, 5)
  await db.settings.put({ id: PICKS_ID, value: picks, updatedAt: now })
}
