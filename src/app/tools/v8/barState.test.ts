import { describe, expect, it } from 'vitest'
import { modeToTool, tapTool, toggleCard } from './barState'
import { ROW_ITEMS, cardIdOf, cardInfo, firstCardOf } from './rowItems'
import { V8_TOOL_IDS } from './registryV8'
import { isIconName } from '../icons'
import { en } from '../../../i18n/en'
import { es } from '../../../i18n/es'
import { hi } from '../../../i18n/hi'

describe('tapTool', () => {
  it('a new tool becomes active and nothing opens (TB-03)', () => {
    expect(tapTool({ tool: 'text', card: null }, 'pen')).toEqual({
      tool: 'pen',
      card: null,
    })
  })

  it('a new tool closes an open card', () => {
    expect(tapTool({ tool: 'pen', card: 'pen.type' }, 'eraser')).toEqual({
      tool: 'eraser',
      card: null,
    })
  })

  it('the active tool again opens its first card, then closes it (TB-04)', () => {
    const open = tapTool({ tool: 'pen', card: null }, 'pen')
    expect(open).toEqual({ tool: 'pen', card: 'pen.type' })
    expect(tapTool(open, 'pen')).toEqual({ tool: 'pen', card: null })
  })

  it('Insert never becomes the active tool; it toggles its card (TB-12)', () => {
    const open = tapTool({ tool: 'pen', card: null }, 'insert')
    expect(open).toEqual({ tool: 'pen', card: 'insert' })
    expect(tapTool(open, 'insert')).toEqual({ tool: 'pen', card: null })
  })

  it('tapping the active tool while another card is open swaps the card', () => {
    expect(tapTool({ tool: 'pen', card: 'pen.size' }, 'pen').card).toBe(
      'pen.type',
    )
  })
})

describe('toggleCard', () => {
  it('opens one card and swaps it for another; never two (TB-05)', () => {
    const a = toggleCard({ tool: 'pen', card: null }, 'pen.type')
    const b = toggleCard(a, 'pen.size')
    expect(b.card).toBe('pen.size')
    expect(toggleCard(b, 'pen.size').card).toBeNull()
  })
})

describe('modeToTool', () => {
  it('follows today’s modes that exist on the new bar', () => {
    expect(modeToTool('pen')).toBe('pen')
    expect(modeToTool('lasso')).toBe('lasso')
    expect(modeToTool('read')).toBeNull()
    expect(modeToTool('highlighter')).toBe('pen')
  })
})

describe('rowItems', () => {
  it('has a row (maybe empty) for every tool; Insert has none', () => {
    for (const id of V8_TOOL_IDS) expect(ROW_ITEMS[id]).toBeDefined()
    expect(ROW_ITEMS.insert).toEqual([])
  })

  it('follows the spec order of the Pen and Text rows (TB-21, TB-40)', () => {
    expect(ROW_ITEMS.pen.map((i) => i.id)).toEqual([
      'type',
      'size',
      'colour',
      'feel',
    ])
    expect(ROW_ITEMS.text.map((i) => i.id)).toEqual([
      'boxset', // the settings button in front of Box (TB-40, T3)
      'box',
      'format',
      'bold',
      'italic',
    ])
  })

  it('every icon exists and every label has English, Spanish and Hindi text', () => {
    for (const id of V8_TOOL_IDS)
      for (const item of ROW_ITEMS[id]) {
        if (item.icon) expect(isIconName(item.icon), item.id).toBe(true)
        expect(en[item.label as keyof typeof en], item.label).toBeTruthy()
        expect(es[item.label as keyof typeof es], item.label).toBeTruthy()
        expect(hi[item.label as keyof typeof hi], item.label).toBeTruthy()
      }
  })

  it('every tool has a first card with a title', () => {
    for (const id of V8_TOOL_IDS) {
      const card = firstCardOf(id)
      expect(cardInfo(card).title).toBeTruthy()
    }
    expect(firstCardOf('pen')).toBe(cardIdOf(ROW_ITEMS.pen[0]!))
    expect(cardInfo('pen.feel').size).toBe('panel')
    expect(cardInfo('pen.type').size).toBe('pick')
  })
})
