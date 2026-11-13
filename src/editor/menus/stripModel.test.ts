import { describe, expect, it } from 'vitest'
import { moreCommands, pasteMenu, stripItems } from './stripModel'

describe('page strip model (PM-20, PM-22, PM-41)', () => {
  it('PM-20 order follows the mock-up and Delete is last, in danger', () => {
    const ids = stripItems().map((i) => i.id)
    expect(ids).toEqual([
      'paste',
      'copy',
      'cut',
      'duplicate',
      'turn',
      'colour',
      'delete',
    ])
    expect(stripItems().at(-1)?.danger).toBe(true)
  })

  it('PM-41 Paste ▾ offers Keep and Plain first, then only what applies', () => {
    const base = pasteMenu({ box: false, ai: false }).map((r) => r.id)
    expect(base).toEqual(['keep', 'plain', 'table', 'quote', 'link'])
    const all = pasteMenu({ box: true, ai: true }).map((r) => r.id)
    expect(all).toEqual([
      'keep',
      'plain',
      'box',
      'table',
      'quote',
      'link',
      'cleanup',
    ])
  })

  it('PM-20 the strip has no Add to favourites and no Comment', () => {
    const ids = stripItems().map((i) => i.id)
    expect(ids).not.toContain('favourite')
    expect(ids).not.toContain('comment')
    const more = moreCommands({ pro: true })[0].items.map((i) => i.id)
    expect(more.join(' ')).not.toMatch(/favourite|comment/i)
  })

  it('PM-41 Paste ▾ shows only the rows the clipboard allows', () => {
    const ids = (forms: string[]) =>
      pasteMenu({ box: true, ai: true, forms }).map((r) => r.id)
    expect(ids(['keep'])).toEqual(['keep', 'plain', 'quote'])
    expect(ids(['keep', 'link'])).toEqual(['keep', 'plain', 'quote', 'link'])
    expect(ids(['keep', 'table', 'cleanup', 'box'])).toEqual([
      'keep',
      'plain',
      'box',
      'table',
      'quote',
      'cleanup',
    ])
    // AI off: no Clean up even when the text could use it.
    expect(
      pasteMenu({ box: false, ai: false, forms: ['keep', 'cleanup'] }).map(
        (r) => r.id,
      ),
    ).toEqual(['keep', 'plain', 'quote'])
  })

  it('PM-22 ⋯ has the four basic rows; Professional adds Copy as', () => {
    const beginner = moreCommands({ pro: false })[0].items.map((i) => i.id)
    expect(beginner).toEqual(['select', 'selectAll', 'picture', 'line'])
    const pro = moreCommands({ pro: true })[0].items.map((i) => i.id)
    expect(pro).toHaveLength(7)
    expect(pro).toContain('copyMarkdown')
  })
})
