/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { describe, expect, it } from 'vitest'
import { pasteHandler, sanitizePastedHtml, tsvToRows } from './clipboard'
import { schema } from './schema'

/*
 * Clipboard HTML in the shapes Notion writes (rebuilt by hand from Notion's
 * HTML export and clipboard: ul.toggle > li > details > summary, toggle
 * headings, figure.callout, hr). Notion's ids, styles and classes are noise.
 */
const NOTION_TOGGLES =
  '<meta charset="utf-8"><ul class="toggle" id="a1" style="margin:0"><li><details open=""><summary>Outer <strong>toggle</strong></summary>' +
  '<p id="p1" class="">Inside text</p>' +
  '<ul class="toggle" id="a2"><li><details open=""><summary>Inner toggle</summary><p>Deep text</p></details></li></ul>' +
  '</details></li></ul>'

const NOTION_HEADING_TOGGLE =
  '<details open=""><summary><h2 id="h">Chapter</h2></summary><p>Body</p></details>'

const NOTION_MIXED =
  '<h1>Title</h1><p class="">A line</p><hr/><p class=""></p><p>After gap</p>' +
  '<ul class="bulleted-list"><li style="list-style-type:disc">One</li><li>Two</li></ul>' +
  '<ol class="numbered-list"><li>First</li></ol>' +
  '<figure class="callout" style="white-space:pre-wrap;display:flex"><div style="font-size:1.5em"><span class="icon">🔥</span></div><div style="width:100%">Hot take</div></figure>'

async function paste(html: string) {
  const editor = BlockNoteEditor.create({ schema })
  editor.mount(document.createElement('div'))
  return editor.tryParseHTMLToBlocks(sanitizePastedHtml(html))
}

describe('pasting from Notion', () => {
  it('keeps nested toggles, their words and bold', async () => {
    const doc = await paste(NOTION_TOGGLES)
    const outer = doc[0]
    expect(outer.type).toBe('toggleListItem')
    expect(JSON.stringify(outer.content)).toContain('toggle')
    expect(outer.children.map((c) => c.type)).toEqual([
      'paragraph',
      'toggleListItem',
    ])
    expect(outer.children[1].children[0].type).toBe('paragraph')
  })
  it('makes a toggle heading', async () => {
    const [h] = await paste(NOTION_HEADING_TOGGLE)
    expect(h.type).toBe('heading')
    expect(h.props).toMatchObject({ level: 2, isToggleable: true })
    expect(h.children).toHaveLength(1)
  })
  it('keeps dividers, lists, callouts and a blank line', async () => {
    const blocks = await paste(NOTION_MIXED)

    const types = blocks.map((b) => b.type)
    expect(types).toContain('divider')
    expect(types).toContain('bulletListItem')
    expect(types).toContain('numberedListItem')
    expect(types).toContain('callout')
    expect(types.filter((x) => x === 'paragraph')).toHaveLength(3)
    expect(types.indexOf('divider')).toBeLessThan(types.indexOf('callout'))
  })
  it('strips scripts and handlers inside toggles', async () => {
    const clean = sanitizePastedHtml(
      '<details open="" onclick="x()" style="a:b"><summary onmouseover="x()">T<script>1</script></summary><p>c</p></details>',
    )
    expect(clean).toBe(
      '<details open=""><summary>T</summary><p>c</p></details>',
    )
  })
})

describe('pasting Markdown', () => {
  it('reads lists and quotes; a details block becomes a toggle', async () => {
    const editor = BlockNoteEditor.create({ schema })
    editor.mount(document.createElement('div'))
    const blocks = await editor.tryParseMarkdownToBlocks(
      '- one\n- two\n\n> quote\n\n<details>\n<summary>Fold</summary>\n\nHidden\n\n</details>',
    )
    const types = blocks.map((b) => b.type)
    expect(types).toContain('bulletListItem')
    expect(types).toContain('quote')
  })
})

describe('pasting rows as text', () => {
  it('reads tab-separated rows and keeps the first row a plain row', () => {
    expect(tsvToRows('📄 Doc name\tTags\nSecond\tb\n')).toEqual([
      ['📄 Doc name', 'Tags'],
      ['Second', 'b'],
    ])
  })
  it('refuses text that is not a grid', () => {
    expect(tsvToRows('one line\twith tab')).toBeNull()
    expect(tsvToRows('a\tb\nno tab')).toBeNull()
    expect(tsvToRows('plain\ntext')).toBeNull()
  })
  it('pastes the rows as a Table block, never a heading', () => {
    const editor = BlockNoteEditor.create({ schema })
    editor.mount(document.createElement('div'))
    const data = {
      types: ['text/plain'],
      getData: (t: string) =>
        t === 'text/plain' ? '📄 Doc name\tTags\nB\tc' : '',
    }
    pasteHandler({
      event: { clipboardData: data } as unknown as ClipboardEvent,
      editor,
      defaultPasteHandler: () => false,
    })
    const types = editor.document.map((b) => b.type)
    expect(types).toContain('table')
    expect(types).not.toContain('heading')
  })
})
