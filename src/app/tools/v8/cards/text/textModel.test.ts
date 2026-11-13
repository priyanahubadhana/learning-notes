import { describe, expect, it } from 'vitest'
import { findTool } from '../../../toolRegistry'
import { ROW_ITEMS } from '../../rowItems'
import { formatSections, BOX_LOOKS } from './textModel'

const ids = (pro = false) =>
  formatSections({ textFonts: pro, textMarks: pro }).flatMap((s) =>
    s.tiles.map((x) => x.tool),
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

describe('Format card (TB-41)', () => {
  it('Beginner has Text, Style, Paragraph in that order', () => {
    const s = formatSections({ textFonts: false, textMarks: false })
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
      'alignLeft',
      'alignCenter',
      'alignRight',
      'callout',
      'divider',
    ])
      expect(ids()).toContain(id)
  })
  it('every tile is a real tool (or the key-point star)', () => {
    for (const id of ids(true))
      expect(id === 'mark:key' || findTool(id), id).toBeTruthy()
  })
  it('Professional adds Advanced (fonts) and inline code only when unlocked', () => {
    expect(ids()).not.toContain('font')
    expect(ids()).not.toContain('code')
    const pro = formatSections({ textFonts: true, textMarks: true })
    expect(pro.map((x) => x.id)).toEqual([
      'text',
      'style',
      'paragraph',
      'advanced',
    ])
    expect(ids(true)).toContain('font')
    expect(ids(true)).toContain('code')
    const oneOnly = formatSections({ textFonts: true, textMarks: false })
    expect(oneOnly.flatMap((s) => s.tiles.map((x) => x.tool))).not.toContain(
      'code',
    )
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
