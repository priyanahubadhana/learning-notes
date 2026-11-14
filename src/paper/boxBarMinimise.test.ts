import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('TB-43 (M2): the text box mini-bar has one minimise at most, and the top bar has no Done (M3)', () => {
  it('BoxBar draws no minimise button of its own', () => {
    const src = readFileSync('src/paper/BoxBar.tsx', 'utf8')
    expect(src).not.toMatch(/minimi[sz]e/i)
  })
  it('neither top bar draws a Done button', () => {
    for (const f of ['src/app/TopBar.tsx', 'src/app/shell/ShellTopBar.tsx']) {
      const src = readFileSync(f, 'utf8')
      expect(src, f).not.toMatch(/t\('(dialog|common|bar)\.done'\)/)
      expect(src, f).not.toMatch(/>\s*Done\s*</)
    }
  })
})
