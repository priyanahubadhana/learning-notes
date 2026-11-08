import { describe, expect, it } from 'vitest'
import { paperHtml, sheetsFor, type PaperInput } from './paperLayout'
import type { ExportNode } from './model'

const para = (id: string, text: string): ExportNode => ({
  id,
  kind: 'paragraph',
  runs: [{ text }],
  children: [],
})

const input = (bg: PaperInput['bg'] = 'lined'): PaperInput => ({
  title: 'My <page>',
  sheet: { w: 210, h: 297 },
  bg,
  boxes: [
    { id: 'main', x: 15, y: 8, w: 180, nodes: [para('b1', 'Hello & goodbye')] },
    {
      id: 'x1',
      x: 100,
      y: 350,
      w: 90,
      colour: 'green',
      nodes: [para('b2', 'Second sheet')],
    },
  ],
})

describe('paper layout', () => {
  it('counts the sheets the boxes reach', () => {
    const boxes = input().boxes
    expect(sheetsFor(boxes, { main: 50, x1: 20 }, 297)).toBe(2)
    expect(sheetsFor(boxes, { main: 50, x1: 300 }, 297)).toBe(3)
    expect(sheetsFor([], {}, 297)).toBe(1)
  })

  it('the measuring copy puts every box on one tall sheet', () => {
    const html = paperHtml(input())
    expect(html.match(/class="sheet measure"/g)).toHaveLength(1)
    expect(html).toContain('data-bc="main"')
    expect(html).toContain('data-b="b2"')
  })

  it('the final copy has real-size sheets, boxes at their places, escaped text', () => {
    const html = paperHtml(input(), { heights: { main: 20, x1: 15 } })
    expect(html).toContain('@page{size:210mm 297mm;margin:0}')
    expect(html.match(/data-sheet="/g)).toHaveLength(2)
    // The second box sits on sheet 2, 53 mm from its top (350 - 297).
    const sheet2 = html.slice(html.indexOf('data-sheet="2"'))
    expect(sheet2).toContain('left:100mm;top:53mm;width:90mm')
    expect(sheet2).not.toContain('data-bx="main"')
    expect(html).toContain('Hello &amp; goodbye')
    expect(html).toContain('<title>My &lt;page&gt;</title>')
    // The background and the box colour print.
    expect(html).toContain('print-color-adjust:exact')
    expect(html).toContain('background-size:100% 8mm')
    expect(html).toContain('color-mix(in srgb, #22c55e 14%')
  })

  it('a box crossing a sheet edge is on both sheets; ink goes in its box', () => {
    const html = paperHtml(input('grid'), {
      heights: { main: 400, x1: 10 },
      ink: new Map([
        ['main', { url: 'data:image/png;base64,AAAA', w: 680, h: 400 }],
      ]),
    })
    expect(html.match(/data-bx="main"/g)).toHaveLength(2)
    expect(html).toContain('class="inkimg"')
    expect(html).toContain('background-size:5mm 5mm')
  })
})
