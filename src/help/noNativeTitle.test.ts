/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * A native `title=` on a button shows the browser's own tooltip, which gets
 * stuck on an iPad (and cannot be hidden by Settings › Show help). Icon
 * buttons use `IconButton tip=` or an `aria-label` instead. `PopupHeader`
 * and `RenameInput` are components with their own `title` prop, so they are
 * not matched. Files in LEGACY still hold native titles from before the
 * polish pass; the list may only shrink (new code must not be added to it).
 */
const LEGACY = new Set([
  'src/app/reading/BookmarksPanel.tsx',
  'src/app/reading/ContentsPane.tsx',
  'src/app/spaces/QuietCorner.tsx',
  'src/app/tools/main/MiniKeysStrip.tsx',
  'src/app/tools/main/MiniToolbar.tsx',
  'src/app/tools/main/OptionsPill.tsx',
  'src/app/tools/main/cardParts.tsx',
  'src/app/tools/main/pillParts.tsx',
  'src/app/tools/PopupClose.tsx',
  'src/app/tools/Ribbon.tsx',
  'src/app/tools/RibbonOptions.tsx',
  'src/app/tools/ThemePicker.tsx',
  'src/app/tools/ToolButton.tsx',
  'src/app/TopBar.tsx',
  'src/app/ui.tsx',
  'src/databases/CalendarScreen.tsx',
  'src/editor/BarStack.tsx',
  'src/editor/ColorPicker.tsx',
  'src/editor/PictureHandles.tsx',
  'src/ink/InkSurface.tsx',
  'src/ink/LayersCard.tsx',
  'src/ink/MagnifierView.tsx',
  'src/ink/RulerView.tsx',
  'src/memory/MemoryHelpers.tsx',
  'src/notebooks/NotebookScreen.tsx',
  'src/pages/PagePath.tsx',
  'src/pages/PageView.tsx',
  'src/search/SearchScreen.tsx',
  'src/tags/TagChip.tsx',
  'src/tags/TagsSection.tsx',
  'src/app/spaces/SpacePlaceholder.tsx',
  'src/app/tools/main/SelectionMenu.tsx',
  'src/ink/MixedMenu.tsx',
  'src/links/LinkPicker.tsx',
])

const SRC = new URL('../', import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  '$1',
)

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    if (e.isDirectory()) return files(p)
    return p.endsWith('.tsx') && !p.endsWith('.test.tsx') ? [p] : []
  })
}

/** Lines of buttons (and untipped IconButtons) that set `title`. */
function nativeTitles(file: string): number[] {
  const text = readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const found: number[] = []
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText(sf)
      if (name === 'button' || name === 'IconButton') {
        const attrs = node.attributes.properties.filter(ts.isJsxAttribute)
        const has = (n: string) => attrs.some((a) => a.name.getText(sf) === n)
        if (has('title') && !(name === 'IconButton' && has('tip'))) {
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

describe('no native title tooltips on buttons', () => {
  it('only the legacy files still set title= on a button', () => {
    const bad: string[] = []
    const clean: string[] = []
    for (const f of files(SRC)) {
      const rel = 'src/' + f.slice(SRC.length).replace(/\\/g, '/')
      const lines = nativeTitles(f)
      if (lines.length && !LEGACY.has(rel))
        bad.push(`${rel}:${lines.join(',')}`)
      if (!lines.length && LEGACY.has(rel)) clean.push(rel)
    }
    expect(bad).toEqual([])
    // A legacy file that is clean must leave the list, so it cannot slip back.
    expect(clean).toEqual([])
  })
})
