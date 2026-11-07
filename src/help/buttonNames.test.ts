/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * K2 accessibility check: a `<button>` that shows no text (only an icon or
 * nothing) must carry an `aria-label`, `aria-labelledby` or `title`, or it is
 * announced as just "button" by VoiceOver. Buttons that spread props
 * (`{...props}`) take their name from the caller and are skipped.
 */
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

function nameless(file: string): number[] {
  const sf = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const found: number[] = []
  const hasText = (n: ts.JsxElement) => {
    let text = false
    const v = (x: ts.Node) => {
      if (ts.isJsxText(x) && x.text.trim()) text = true
      if (ts.isJsxExpression(x) && !ts.isJsxAttribute(x.parent)) text = true
      ts.forEachChild(x, v)
    }
    n.children.forEach(v)
    return text
  }
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const open = ts.isJsxElement(node) ? node.openingElement : node
      if (open.tagName.getText(sf) === 'button') {
        const props = open.attributes.properties
        const names = props
          .filter(ts.isJsxAttribute)
          .map((a) => a.name.getText(sf))
        const named = [
          'aria-label',
          'aria-labelledby',
          'title',
          'aria-hidden',
        ].some((n) => names.includes(n))
        const spread = props.some(ts.isJsxSpreadAttribute)
        const text = ts.isJsxElement(node) && hasText(node)
        if (!named && !spread && !text) {
          found.push(
            sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          )
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

describe('buttons without text have a name', () => {
  it('every icon-only button has an aria-label or title', () => {
    const bad: string[] = []
    for (const f of files(SRC)) {
      const lines = nameless(f)
      if (lines.length) {
        bad.push(
          `${f.slice(SRC.length).replace(/\\/g, '/')}:${lines.join(',')}`,
        )
      }
    }
    expect(bad).toEqual([])
  })
})
