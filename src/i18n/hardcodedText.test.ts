/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * No English in JSX (polish 1, item 14): a text node written straight into
 * JSX, or an `aria-label="…"` / `placeholder="…"` / `alt="…"` string with
 * letters, bypasses `t('key')` and so never gets translated. Strings that
 * are not words (symbols, key names, brand names) are allowed below. Files
 * in LEGACY held such text before this check; their count may only go down.
 */

/** Words that are names or key labels, not sentences. */
const ALLOWED = new Set([
  'Ctrl',
  'Shift',
  'Alt',
  'Esc',
  'Enter',
  'Tab',
  'Cmd',
  'Option',
  'PDF',
  'EPUB',
  'DOCX',
  'AI',
  'OK',
  'A',
  'B',
  'Aa',
  'A+',
  'A−',
  'Space',
  'INR', // a currency code
  'touchstart', // an event name in the Pencil lab
  'Learning Notes', // the app's name
])

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    if (e.isDirectory()) return files(p)
    return p.endsWith('.tsx') && !p.endsWith('.test.tsx') ? [p] : []
  })
}

const SRC = new URL('../', import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  '$1',
)

/** Hard-coded words in a file: [line, text]. */
function findings(file: string): [number, string][] {
  const text = readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const out: [number, string][] = []
  const wordy = (s: string) => {
    const trimmed = s.trim()
    if (!/[A-Za-z]{2,}/.test(trimmed)) return false
    return !ALLOWED.has(trimmed.replace(/^[^A-Za-z]+/, ''))
  }
  const line = (n: ts.Node) =>
    sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && wordy(node.text)) {
      out.push([line(node), node.text.trim().slice(0, 40)])
    }
    if (
      ts.isJsxAttribute(node) &&
      ['aria-label', 'placeholder', 'alt'].includes(node.name.getText(sf)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      wordy(node.initializer.text)
    ) {
      out.push([line(node), node.initializer.text.slice(0, 40)])
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

/** Files that already held hard-coded text, with how many places. */
const LEGACY: Record<string, number> = {}

describe('no hard-coded English in JSX', () => {
  it('finds nothing new', () => {
    const found: Record<string, [number, string][]> = {}
    for (const f of files(SRC)) {
      const rel = 'src/' + f.slice(SRC.length).replace(/\\/g, '/')
      const list = findings(f)
      if (list.length) found[rel] = list
    }
    const worse: string[] = []
    for (const [rel, list] of Object.entries(found)) {
      if (list.length > (LEGACY[rel] ?? 0)) {
        worse.push(`${rel}: ${list.map(([l, s]) => `${l} “${s}”`).join(', ')}`)
      }
    }
    expect(worse).toEqual([])
    // A legacy entry that got cleaner must be lowered, so it cannot creep back.
    const stale = Object.entries(LEGACY)
      .filter(([rel, n]) => (found[rel]?.length ?? 0) < n)
      .map(([rel]) => rel)
    expect(stale).toEqual([])
  })
})
