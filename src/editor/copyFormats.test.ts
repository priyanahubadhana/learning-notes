import { describe, expect, it } from 'vitest'
import {
  blocksToHtml,
  blocksToMarkdown,
  blocksToPlain,
  lonePicture,
  type CopyBlock,
} from './copyFormats'

const text = (s: string, styles = {}) => ({ type: 'text', text: s, styles })
const para = (...c: unknown[]): CopyBlock => ({ type: 'paragraph', content: c })

const RICH: CopyBlock[] = [
  { type: 'heading', props: { level: 2 }, content: [text('Cells')] },
  para(text('A '), text('bold', { bold: true }), text(' and a '), {
    type: 'link',
    href: 'https://example.com',
    content: [text('link')],
  }),
  {
    type: 'bulletListItem',
    content: [text('one')],
    children: [{ type: 'bulletListItem', content: [text('nested')] }],
  },
  { type: 'numberedListItem', content: [text('first')] },
  { type: 'numberedListItem', content: [text('second')] },
  {
    type: 'toggleListItem',
    content: [text('More')],
    children: [para(text('hidden'))],
  },
  {
    type: 'card',
    content: [text('What is ATP?')],
    children: [para(text('Energy'))],
  },
  {
    type: 'table',
    content: {
      type: 'tableContent',
      rows: [
        { cells: [[text('a')], [text('b')]] },
        { cells: [[text('1')], [text('2')]] },
      ],
    },
  },
  {
    type: 'codeBlock',
    props: { language: 'js' },
    content: [text('let x = 1')],
  },
]

describe('copy formats', () => {
  it('writes clean Markdown', () => {
    const md = blocksToMarkdown(RICH)
    expect(md).toContain('## Cells')
    expect(md).toContain('**bold**')
    expect(md).toContain('[link](https://example.com)')
    expect(md).toContain('- one\n  - nested')
    expect(md).toContain('1. first\n2. second')
    expect(md).toContain('<details>\n<summary>More</summary>')
    expect(md).toContain('**Q:** What is ATP?')
    expect(md).toContain('**A:** Energy')
    expect(md).toContain('| a | b |\n| --- | --- |\n| 1 | 2 |')
    expect(md).toContain('```js\nlet x = 1\n```')
  })
  it('writes rich HTML with lists, details, tables and links', () => {
    const html = blocksToHtml(RICH)
    expect(html).toContain('<h2>Cells</h2>')
    expect(html).toContain('<ul><li>one<ul><li>nested</li></ul></li></ul>')
    expect(html).toContain('<ol><li>first</li><li>second</li></ol>')
    expect(html).toContain('<details open><summary>More</summary>')
    expect(html).toContain('<strong>Q:</strong>')
    expect(html).toContain('<table>')
    expect(html).toContain('<a href="https://example.com">link</a>')
  })
  it('escapes HTML and refuses unsafe links', () => {
    const html = blocksToHtml([
      para(text('<script>x</script>'), {
        type: 'link',
        href: 'javascript:alert(1)',
        content: [text('bad')],
      }),
    ])
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('javascript:')
  })
  it('plain text is the words only', () => {
    expect(blocksToPlain(RICH)).toContain('What is ATP?\nEnergy')
  })
  it('knows a lone picture', () => {
    const img: CopyBlock = { type: 'image', props: { url: 'lnimg:1' } }
    expect(lonePicture([img])).toBe(img)
    expect(lonePicture([img, para(text('x'))])).toBeNull()
  })
})
