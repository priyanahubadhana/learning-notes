// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'
import { createBlock } from '../../core/blockService'
import type { LearningNotesDB } from '../../core/db'
import { createTestDb } from '../../core/testing'
import type { JsonObject } from '../../core/types'
import { getOrCreateDefaultWorkspace } from '../../core/workspaceService'
import { createNotebook } from '../../notebooks/notebookService'
import { createPage } from '../../pages/pageService'
import { buildExport } from './exportService'
import { loadExportPage } from './model'
import { printHtml } from './printHtml'

let db: LearningNotesDB
let nb: string

beforeEach(async () => {
  db = createTestDb()
  const ws = (await getOrCreateDefaultWorkspace(db)).id
  nb = (await createNotebook(db, ws, 'Heart notes')).id
})
afterEach(async () => {
  await db.delete()
})

const text = (
  s: string,
  styles: Record<string, unknown> = {},
): JsonObject[] => [{ type: 'text', text: s, styles } as JsonObject]

async function block(
  pageId: string,
  type: string,
  content: JsonObject,
  parentId: string | null = null,
) {
  return createBlock(db, { pageId, type, content, parentId })
}

async function sample() {
  const page = await createPage(db, nb, null, 'Valves & <flow>')
  await block(page.id, 'heading', { text: text('Intro'), level: 1 })
  await block(page.id, 'paragraph', {
    text: [
      { type: 'text', text: 'Blood ', styles: {} },
      { type: 'text', text: 'flows', styles: { bold: true } },
      {
        type: 'link',
        href: 'https://example.com/a',
        content: [{ type: 'text', text: ' here', styles: { italic: true } }],
      },
    ] as unknown as JsonObject[],
  })
  const parent = await block(page.id, 'bulletListItem', { text: text('Atria') })
  await block(page.id, 'bulletListItem', { text: text('Left') }, parent.id)
  await block(page.id, 'numberedListItem', { text: text('First') })
  await block(page.id, 'numberedListItem', { text: text('Second') })
  await block(page.id, 'checkListItem', { text: text('Revise'), checked: true })
  await block(page.id, 'codeBlock', { text: text('a < b'), language: 'js' })
  await block(page.id, 'table', {
    text: {
      type: 'tableContent',
      rows: [
        { cells: [text('A'), text('B')] },
        { cells: [text('1'), text('2 | 3')] },
      ],
    },
  } as unknown as JsonObject)
  return page
}

describe('Markdown and text', () => {
  it('writes headings, marks, links, nested lists, to-dos, code and tables', async () => {
    const page = await sample()
    const r = await buildExport(db, { kind: 'page', pageId: page.id }, 'md')
    expect(r.kind).toBe('file')
    if (r.kind !== 'file') return
    expect(r.fileName).toBe('Valves & flow.md')
    const md = await r.blob.text()
    expect(md).toContain('## Intro')
    expect(md).toContain('Blood **flows** [*here*](https://example.com/a)')
    expect(md).toContain('- Atria\n  - Left')
    expect(md).toContain('1. First\n2. Second')
    expect(md).toContain('- [x] Revise')
    expect(md).toContain('```js\na < b\n```')
    expect(md).toContain('| A | B |\n| --- | --- |\n| 1 | 2 \\| 3 |')
  })

  it('plain text has no marks and uses simple signs', async () => {
    const page = await sample()
    const r = await buildExport(db, { kind: 'page', pageId: page.id }, 'txt')
    if (r.kind !== 'file') throw new Error('file expected')
    const out = await r.blob.text()
    expect(out).toContain('Blood flows here')
    expect(out).toContain('• Atria\n  • Left')
    expect(out).toContain('☑ Revise')
    expect(out).not.toContain('**')
  })

  it('includes sub-pages as deeper headings and leaves out locked ones', async () => {
    const page = await sample()
    const sub = await createPage(db, nb, page.id, 'Aorta')
    await block(sub.id, 'paragraph', { text: text('Biggest vessel') })
    const locked = await createPage(db, nb, page.id, 'Secret')
    await db.pages.update(locked.id, { locked: true })
    const got = await loadExportPage(db, page.id, { subpages: true })
    expect(got.skipped).toBe(1)
    expect(got.page?.children.map((c) => c.title)).toEqual(['Aorta'])
    const r = await buildExport(
      db,
      { kind: 'page', pageId: page.id, subpages: true },
      'md',
    )
    if (r.kind !== 'file') throw new Error('file expected')
    expect(await r.blob.text()).toContain('## Aorta')
    expect(r.skipped).toBe(1)
  })
})

describe('Word file', () => {
  it('is a zip with the document, styles, numbering and the right text', async () => {
    const page = await sample()
    const r = await buildExport(db, { kind: 'page', pageId: page.id }, 'docx')
    if (r.kind !== 'file') throw new Error('file expected')
    expect(r.fileName.endsWith('.docx')).toBe(true)
    const files = unzipSync(new Uint8Array(await r.blob.arrayBuffer()))
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        '[Content_Types].xml',
        '_rels/.rels',
        'word/document.xml',
        'word/styles.xml',
        'word/numbering.xml',
        'word/_rels/document.xml.rels',
      ]),
    )
    const doc = strFromU8(files['word/document.xml'])
    expect(doc).toContain('w:val="Heading1"')
    expect(doc).toContain('<w:b/>')
    expect(doc).toContain('Blood ')
    expect(doc).toContain('a &lt; b')
    expect(doc).toContain('<w:tbl>')
    expect(doc).toContain('☑ ')
    expect(strFromU8(files['word/_rels/document.xml.rels'])).toContain(
      'https://example.com/a',
    )
    // Every part is well-formed XML.
    for (const [name, bytes] of Object.entries(files)) {
      if (!name.endsWith('.xml') && !name.endsWith('.rels')) continue
      const parsed = new DOMParser().parseFromString(
        strFromU8(bytes),
        'application/xml',
      )
      expect(parsed.getElementsByTagName('parsererror').length, name).toBe(0)
    }
  })
})

describe('Print document', () => {
  it('escapes text, groups list items and refuses script links', () => {
    const html = printHtml([
      {
        title: '<b>x</b>',
        children: [],
        nodes: [
          {
            kind: 'bullet',
            runs: [{ text: 'one' }],
            children: [],
          },
          {
            kind: 'bullet',
            runs: [{ text: 'two', href: 'javascript:alert(1)' }],
            children: [],
          },
        ],
      },
    ])
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html.match(/<ul>/g)).toHaveLength(1)
    expect(html).not.toContain('javascript:')
  })

  it('PDF export returns a printable document', async () => {
    const page = await sample()
    const r = await buildExport(db, { kind: 'page', pageId: page.id }, 'pdf')
    expect(r.kind).toBe('print')
    if (r.kind === 'print') {
      expect(r.html).toContain('<h1 class="title">')
      expect(r.fileName.endsWith('.pdf')).toBe(true)
    }
  })
})
