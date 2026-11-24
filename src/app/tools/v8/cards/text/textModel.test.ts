import { describe, expect, it } from 'vitest'
import { findTool } from '../../../toolRegistry'
import { ROW_ITEMS } from '../../rowItems'
import { formatTabs, TEXT_SIZE_STEPS, BOX_LOOKS } from './textModel'

const ids = (pro = false) =>
  formatTabs({ advanced: pro, textMarks: pro }).flatMap((s) =>
    s.groups.flatMap((g) => g.tiles.map((x) => x.tool)),
  )

describe('Text row (TB-40)', () => {
  it('is Box, Format, B, I, with the settings button in front of Box', () => {
    expect(ROW_ITEMS.text.map((i) => i.id)).toEqual([
      'boxset',
      'box',
      'format',
      'bold',
      'italic',
    ])
  })
})

// T8 (why): Font and Text size ran the Reading tools, which switched the page
// into Reading mode and put the reader's bar over the top bar. They are no
// tools of this card now: the card sets the note size and font itself.
describe('Text size and Font (T8)', () => {
  it('are not tool tiles; the three steps are real note sizes', () => {
    expect(ids(true)).not.toContain('font')
    expect(ids(true)).not.toContain('textSize')
    expect(TEXT_SIZE_STEPS.map((x) => x.pct)).toEqual([90, 100, 130])
  })
})

describe('Format card (TB-41)', () => {
  it('Beginner has Text, Style, Paragraph in that order', () => {
    const s = formatTabs({ advanced: false, textMarks: false })
    expect(s.map((x) => x.id)).toEqual(['text', 'style', 'paragraph'])
  })
  it('has H1-H3, B/I/U/S, lists, indent, alignment, callout, divider', () => {
    for (const id of [
      'heading1',
      'heading2',
      'heading3',
      'bold',
      'italic',
      'underline',
      'strike',
      'bulletList',
      'numberedList',
      'checklist',
      'indent',
      'outdent',
      'quote',
      'callout',
      'divider',
    ])
      expect(ids()).toContain(id)
  })
  // Owner 18 Nov (box bar mock approved): the two toggles are the card's own
  // actions (tile.act), not registry tools; every other tile is still a tool.
  it('every tile is a real tool (or the key-point star, or a toggle)', () => {
    const own = new Set(
      formatTabs({ advanced: true, textMarks: true }).flatMap((s) =>
        s.groups.flatMap((g) =>
          g.tiles.filter((x) => x.act).map((x) => x.tool),
        ),
      ),
    )
    expect([...own].sort()).toEqual(['toggleHeading', 'toggleList'])
    for (const id of ids(true))
      expect(id === 'mark:key' || own.has(id) || findTool(id), id).toBeTruthy()
  })
  it('Toggle heading and Toggle list come first on the Style tab (owner 18 Nov)', () => {
    const style = formatTabs({ advanced: false, textMarks: false }).find(
      (x) => x.id === 'style',
    )!
    expect(style.groups[0].tiles.map((x) => x.tool)).toEqual([
      'toggleHeading',
      'toggleList',
    ])
  })
  it('Advanced tab only with tb.textFonts; inline code only with tb.textMarks', () => {
    expect(ids()).not.toContain('code')
    const pro = formatTabs({ advanced: true, textMarks: true })
    expect(pro.map((x) => x.id)).toEqual([
      'text',
      'style',
      'paragraph',
      'advanced',
    ])
    expect(ids(true)).toContain('code')
    const fontsOnly = formatTabs({ advanced: true, textMarks: false })
    expect(fontsOnly.length).toBe(4)
    expect(
      fontsOnly.flatMap((t) =>
        t.groups.flatMap((g) => g.tiles.map((x) => x.tool)),
      ),
    ).not.toContain('code')
  })
  it('no tile appears twice', () => {
    const all = ids(true)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('Box card looks (TB-42)', () => {
  it('has a few looks, each with a name and a style', () => {
    expect(BOX_LOOKS.length).toBeGreaterThanOrEqual(4)
    for (const l of BOX_LOOKS) {
      expect(l.id).toBeTruthy()
      expect(l.label).toMatch(/^v8\./)
    }
  })
})

// 2A.10 (T15): every option that is a state knows what makes it "on"; the
// one-off actions (Indent, Outdent, Divider, headings run as rows) do not.
describe('Format on states (2A.10)', () => {
  const tiles = formatTabs({ advanced: true, textMarks: true }).flatMap((s) =>
    s.groups.flatMap((g) => g.tiles),
  )
  const byTool = (id: string) => tiles.find((x) => x.tool === id)!
  it('lists, callout and key point carry their state', () => {
    expect(byTool('bulletList').block).toBe('bulletListItem')
    expect(byTool('numberedList').block).toBe('numberedListItem')
    expect(byTool('checklist').block).toBe('checkListItem')
    expect(byTool('callout').block).toBe('callout')
    expect(byTool('mark:key').mark).toBe('key')
  })
  it('emphasis and code carry a style; actions carry no state', () => {
    for (const id of ['bold', 'italic', 'underline', 'strike', 'code'])
      expect(byTool(id).style).toBe(id)
    for (const id of ['indent', 'outdent', 'divider']) {
      const x = byTool(id)
      expect(x.action).toBe(true)
      expect(x.style ?? x.block ?? x.mark).toBeUndefined()
    }
  })
})
