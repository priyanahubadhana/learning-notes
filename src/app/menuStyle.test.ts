/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * One menu style (polish 1, item 15): every ⋯ menu is the shared
 * `MenuPopover` (app/ui.tsx) or `AnchoredMenu` (app/tools/AnchoredMenu.tsx),
 * so every menu has the same ✕ header, 44 px items and red last Delete. A
 * hand-made `<div role="menu">` anywhere else fails here.
 */
const HOMES = new Set(['src/app/ui.tsx', 'src/app/tools/AnchoredMenu.tsx'])

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

function handMadeMenus(file: string): number[] {
  const text = readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const lines: number[] = []
  const visit = (node: ts.Node) => {
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(sf) === 'role' &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      node.initializer.text === 'menu'
    ) {
      lines.push(sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return lines
}

describe('one menu style', () => {
  it('role="menu" is written only in MenuPopover and AnchoredMenu', () => {
    const bad: string[] = []
    for (const f of files(SRC)) {
      const rel = 'src/' + f.slice(SRC.length).replace(/\\/g, '/')
      if (HOMES.has(rel)) continue
      const lines = handMadeMenus(f)
      if (lines.length) bad.push(`${rel}:${lines.join(',')}`)
    }
    expect(bad).toEqual([])
  })
})
