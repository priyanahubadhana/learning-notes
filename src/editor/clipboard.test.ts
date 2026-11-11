/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  blocksToPlainText,
  copyAs,
  copyPageWithPictures,
  embedPictures,
  insertPlainText,
  isPlainPasteKey,
  isSafeHref,
  isSafeSrc,
  sanitizePastedHtml,
} from './clipboard'
import { schema } from './schema'

function setup(texts: string[]) {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: texts.map((content, i) => ({
      id: `b${i}`,
      type: 'paragraph' as const,
      content,
    })),
  })
  editor.mount(document.createElement('div'))
  return editor
}

afterEach(() => vi.unstubAllGlobals())

describe('plain text of blocks', () => {
  it('joins blocks by line, reads links and nested blocks', () => {
    const text = blocksToPlainText([
      {
        content: [
          { type: 'text', text: 'See ', styles: {} },
          { type: 'link', href: 'https://x.test', content: [{ text: 'this' }] },
        ],
        children: [{ content: [{ type: 'text', text: 'child' }] }],
      },
      { content: [{ type: 'text', text: 'last' }] },
    ])
    expect(text).toBe('See this\nchild\nlast')
  })
  it('writes a table row as tab-separated cells', () => {
    const text = blocksToPlainText([
      {
        content: {
          type: 'tableContent',
          rows: [
            { cells: [[{ text: 'a' }], { content: [{ text: 'b' }] }] },
            { cells: [[{ text: 'c' }], [{ text: 'd' }]] },
          ],
        },
      },
    ])
    expect(text).toBe('a\tb\nc\td')
  })
})

describe('cleaning pasted HTML', () => {
  it('removes scripts, styles, frames, forms and event handlers', () => {
    const clean = sanitizePastedHtml(
      '<p onclick="x()" style="color:red" class="a">Hi<script>alert(1)</script></p>' +
        '<style>p{}</style><iframe src="https://e.test"></iframe>' +
        '<form><input name="a"><button>go</button></form><svg onload="x()"></svg>',
    )
    expect(clean).toBe('<p>Hi</p>')
  })
  it('keeps formatting, safe links and pictures', () => {
    const clean = sanitizePastedHtml(
      '<h2>T</h2><p><strong>b</strong> <em>i</em> <a href="https://a.test" target="_blank" onclick="x()">l</a>' +
        '<img src="data:image/png;base64,AAAA" alt="pic" onerror="x()"></p>',
    )
    expect(clean).toContain('<strong>b</strong>')
    expect(clean).toContain('<a href="https://a.test">l</a>')
    expect(clean).toContain('<img src="data:image/png;base64,AAAA" alt="pic">')
    expect(clean).not.toMatch(/onclick|onerror|target/)
  })
  it('drops javascript: links and unsafe picture addresses', () => {
    const clean = sanitizePastedHtml(
      '<a href="javascript:alert(1)">x</a><img src="javascript:1"><img src="data:image/svg+xml;base64,AAAA">',
    )
    expect(clean).toBe('<a>x</a>')
    expect(isSafeHref('JavaScript:alert(1)')).toBe(false)
    expect(isSafeHref('mailto:a@b.test')).toBe(true)
    expect(isSafeSrc('data:text/html;base64,AAAA')).toBe(false)
    expect(isSafeSrc('lnimg:abc')).toBe(true)
  })
  it('unwraps unknown elements and keeps their words', () => {
    expect(sanitizePastedHtml('<custom-tag><p>kept</p></custom-tag>')).toBe(
      '<p>kept</p>',
    )
  })
})

describe('embedding pictures', () => {
  it('turns picture addresses into data: URLs and keeps broken ones', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === 'blob:bad') throw new Error('gone')
        return { blob: async () => new Blob(['x'], { type: 'image/png' }) }
      }),
    )
    const html = await embedPictures(
      '<p><img src="lnimg:a"><img src="lnimg:bad"><img src="data:image/png;base64,QQ=="></p>',
      async (src) => `blob:${src.slice(6)}`,
    )
    const srcs = [...new DOMParser().parseFromString(html, 'text/html').images]
    expect(srcs[0].getAttribute('src')).toMatch(/^data:/)
    expect(srcs[1].getAttribute('src')).toBe('lnimg:bad')
    expect(srcs[2].getAttribute('src')).toBe('data:image/png;base64,QQ==')
  })
})

describe('copying', () => {
  it('copies a block as plain text and as Markdown, then says Copied', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const editor = setup(['hello world'])
    const toast = vi.fn()
    await copyAs(editor, 'plain', toast, [editor.document[0]])
    expect(writeText).toHaveBeenLastCalledWith('hello world')
    await copyAs(editor, 'markdown', toast, [editor.document[0]])
    expect(writeText).toHaveBeenLastCalledWith(
      expect.stringContaining('hello world'),
    )
    expect(toast).toHaveBeenCalledTimes(2)
    expect(toast).toHaveBeenCalledWith('Copied')
  })
  it('falls back to text when the browser blocks rich copy', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('ClipboardItem', class {})
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText,
        write: async () => {
          throw new Error('blocked')
        },
      },
    })
    const editor = setup(['one', 'two'])
    const toast = vi.fn()
    await copyPageWithPictures(editor, toast)
    expect(writeText).toHaveBeenCalledWith('one\ntwo')
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('text only'))
  })
  it('puts HTML and plain text on the clipboard together', async () => {
    const write = vi.fn(async () => {})
    class Item {
      data: Record<string, Blob>
      constructor(data: Record<string, Blob>) {
        this.data = data
      }
    }
    vi.stubGlobal('ClipboardItem', Item)
    vi.stubGlobal('navigator', { clipboard: { write } })
    const editor = setup(['one'])
    const toast = vi.fn()
    await copyPageWithPictures(editor, toast)
    const item = (write.mock.calls[0] as unknown as [Item[]])[0][0]
    expect(Object.keys(item.data).sort()).toEqual(['text/html', 'text/plain'])
    expect(toast).not.toHaveBeenCalled() // B3-12: a visible result needs no toast
  })
})

describe('paste as plain text', () => {
  it('recognises Ctrl/Cmd+Shift+V only', () => {
    const key = { key: 'V', ctrlKey: true, metaKey: false, shiftKey: true }
    expect(isPlainPasteKey(key)).toBe(true)
    expect(isPlainPasteKey({ ...key, ctrlKey: false, metaKey: true })).toBe(
      true,
    )
    expect(isPlainPasteKey({ ...key, shiftKey: false })).toBe(false)
    expect(isPlainPasteKey({ ...key, ctrlKey: false })).toBe(false)
  })
  it('inserts words at the cursor, new lines become new paragraphs', () => {
    const editor = setup(['ab'])
    editor.setTextCursorPosition('b0', 'end')
    insertPlainText(editor, 'X\r\nsecond\nthird')
    const texts = editor.document.map((b) =>
      (b.content as { text: string }[]).map((c) => c.text).join(''),
    )
    expect(texts.slice(0, 3)).toEqual(['abX', 'second', 'third'])
  })
})
