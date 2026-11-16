/**
 * How a line of text splits into things a tap or a loop can pick (C5, owner's
 * combined test 16 Nov). The old splitter knew only words (letters, digits
 * and the usual joins), so an arrow, a comma, a slash or a run like "//"
 * could not be selected at all: a double tap on one did nothing, and the
 * Lasso's Text pick skipped it.
 *
 * With `symbols` on (switch textbox.v2) a line is words, symbol runs and
 * spaces:
 *  - a WORD is a run of letters (with their accents and vowel signs),
 *    digits (also ① ② …) and the joins _ ’ ' -;
 *  - a SYMBOL RUN is a run of anything else that is not a space: "→",
 *    ",", "/", "//", "->";
 *  - spaces (and the blank kept for a line break) split both.
 * A double tap on a symbol selects its run, never the word next to it.
 * With `symbols` off the old rule holds exactly. Pure (textTokens.test.ts).
 */

export type CharKind = 'word' | 'symbol' | 'space'

const WORD = /[\p{L}\p{M}\p{N}_’'-]/u
/** The old rule (switch off): no accents or vowel signs inside a word. */
const OLD_WORD = /[\p{L}\p{N}_’'-]/u
const SPACE = /\s/u

/** What `ch` is; `symbols` off keeps the old word rule. */
export function charKind(ch: string | undefined, symbols = true): CharKind {
  if (!ch || SPACE.test(ch)) return 'space'
  return (symbols ? WORD : OLD_WORD).test(ch) ? 'word' : 'symbol'
}

const JOIN = /[_’'-]/u

/**
 * What the character at `i` is in its place. With `symbols` on, a join
 * (_ ’ ' -) is part of a word only between two word letters ("it’s",
 * "a-b"); elsewhere it is a symbol, so "->" or a quote mark is picked as a
 * symbol run.
 */
export function kindAt(text: string, i: number, symbols: boolean): CharKind {
  if (i < 0 || i >= text.length) return 'space'
  const k = charKind(text[i], symbols)
  if (!symbols || k !== 'word' || !JOIN.test(text[i])) return k
  const core = (j: number) =>
    j >= 0 &&
    j < text.length &&
    charKind(text[j]) === 'word' &&
    !JOIN.test(text[j])
  return core(i - 1) && core(i + 1) ? 'word' : 'symbol'
}

/** The run of one kind around index `i`, as [from, to). */
function runAt(text: string, i: number, symbols: boolean): [number, number] {
  const kind = kindAt(text, i, symbols)
  let from = i
  let to = i + 1
  while (from > 0 && kindAt(text, from - 1, symbols) === kind) from--
  while (to < text.length && kindAt(text, to, symbols) === kind) to++
  return [from, to]
}

/**
 * Which side of a caret position the tap was on: the character just after
 * (`after`), just before (`before`), or not known (`any`).
 */
export type Lean = 'before' | 'after' | 'any'

/**
 * The word or symbol run at caret `offset` in `text`, as [from, to) (null on
 * a space). With `symbols` off only words count (the old rule). With a lean,
 * the character on that side is the one tapped; without one a word on
 * either side wins over a symbol, as before.
 */
export function tokenAround(
  text: string,
  offset: number,
  symbols: boolean,
  lean: Lean = 'any',
): [number, number] | null {
  const kind = (i: number): CharKind => kindAt(text, i, symbols)
  const after = kind(offset)
  const before = kind(offset - 1)
  const ok = (k: CharKind) => k === 'word' || (symbols && k === 'symbol')
  const run = (i: number) => runAt(text, i, symbols)
  if (lean === 'after' && ok(after)) return run(offset)
  if (lean === 'before' && ok(before)) return run(offset - 1)
  if (after === 'word') return run(offset)
  if (before === 'word') return run(offset - 1)
  if (symbols && after === 'symbol') return run(offset)
  if (symbols && before === 'symbol') return run(offset - 1)
  return null
}

/** Every word (and, with `symbols`, every symbol run) of `text`, in order. */
export function tokenSpans(text: string, symbols: boolean): [number, number][] {
  const out: [number, number][] = []
  let i = 0
  while (i < text.length) {
    const kind = kindAt(text, i, symbols)
    if (kind === 'space' || (kind === 'symbol' && !symbols)) {
      i++
      continue
    }
    const run = runAt(text, i, symbols)
    out.push(run)
    i = run[1]
  }
  return out
}
