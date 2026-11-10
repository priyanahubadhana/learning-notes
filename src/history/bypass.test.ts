import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Fails when an action bypasses the page's one Undo history (item 3). The
 * rules are about the entry points, so nobody can add a second history:
 *
 * 1. Only the journal, the history extension and the Write pad may import
 *    `prosemirror-history` (its undo/redo would run a private history).
 * 2. Only the ink controller and the journal may call `undoStep`/`redoStep`
 *    (the ink's raw undo).
 * 3. No file outside src/history may run a private stack of its own: a field
 *    called `undoStack`/`redoStack` (ink/inkHistory.ts and the Write pad's
 *    list are the two allowed, both fed by or feeding the journal).
 * 4. Database writes need no call: core/rowCapture.ts records them from
 *    the database; pageHistory.test.ts checks that every table is classified.
 */

const root = join(__dirname, '..')

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) files(p, out)
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p)
  }
  return out
}

const rel = (p: string) =>
  p
    .slice(root.length + 1)
    .split(String.fromCharCode(92))
    .join('/')
const all = files(root).map((p) => ({
  path: rel(p),
  text: readFileSync(p, 'utf8'),
}))

const offenders = (pattern: RegExp, allowed: RegExp): string[] =>
  all
    .filter((f) => pattern.test(f.text) && !allowed.test(f.path))
    .map((f) => f.path)

describe('no action bypasses the one history', () => {
  it('only the journal and the editor extension import prosemirror-history', () => {
    expect(
      offenders(
        /from 'prosemirror-history'|import\('prosemirror-history'\)/,
        /^(history\/pageHistory|editor\/historyExtension|editor\/pm|editor\/writePad\/WritePad|ink\/InkSurface|ink\/MixedMenu)\.tsx?$/,
      ),
    ).toEqual([])
  })

  it("the ink's raw undo is called only by the ink and the journal", () => {
    expect(
      offenders(
        /\.(undoStep|redoStep)\(/,
        /^(ink\/controller|history\/[a-zA-Z]+)\.ts$/,
      ),
    ).toEqual([])
  })

  it('no second undo stack is kept', () => {
    expect(
      offenders(
        /\b(undoStack|redoStack)\b/,
        /^(ink\/inkHistory|history\/[a-zA-Z]+)\.ts$/,
      ),
    ).toEqual([])
  })

  it('every undo button goes to the one history', () => {
    // The tool, the reader icons and the toasts call runHistory / undo().
    expect(
      offenders(
        /controller\.(undo|redo)\(\)|pmUndo\(|pmRedo\(/,
        /^(history\/[a-zA-Z]+|ai\/ConvertInk|ink\/LayersCard|reader\/ReaderInkBar)\.tsx?$/,
      ),
    ).toEqual([])
  })
})
