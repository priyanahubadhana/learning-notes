/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { describe, expect, it } from 'vitest'
import { sanitizePastedHtml } from './clipboard'
import {
  applyPaste,
  choicesFor,
  labelKey,
  planPaste,
  previewOf,
} from './pasteFlow'
import {
  detectSource,
  fenceTrees,
  looksLikeMarkdown,
  markdownTableRows,
  treeSegments,
} from './pasteSources'
import { schema } from './schema'

/*
 * Fixtures are written by hand in the shapes each app puts on the clipboard
 * (no live clipboard here); the owner pastes real ones in the owner check.
 */
const GEMINI =
  '<message-content><div class="markdown"><h2 data-path-to-node="1">AI Agents Explained</h2>' +
  '<p data-path-to-node="2"><b data-path-to-node="2">Goal:</b> understand agents ✅ not chatbots ❌</p>' +
  '<ul><li><p><b>Level 1:</b> a plain LLM with <code>no tools</code></p></li><li><p>Level 2: tools</p></li></ul>' +
  '<table-block><div class="table-block-component"><table><thead><tr><th>Level</th><th>Tool Access</th></tr></thead>' +
  '<tbody><tr><td>1</td><td>None</td></tr><tr><td>2</td><td>Search</td></tr></tbody></table></div></table-block>' +
  '<blockquote><p>Agents act, chatbots answer.</p></blockquote>' +
  '<p>See <a href="https://example.com/agents">sources</a></p>' +
  '<code-block><div class="code-block-decoration">Python <button>Copy</button></div><pre><code>print("hi")\n</code></pre></code-block>' +
  '</div></message-content>'

const GDOCS =
  '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1234-abcd">' +
  '<h1 dir="ltr"><span style="font-size:20pt;font-weight:700">Title</span></h1>' +
  '<p dir="ltr"><span style="font-weight:700">bold</span> <span style="font-style:italic">italic</span> <span style="text-decoration:underline">under</span> <span style="text-decoration:line-through">gone</span></p>' +
  '<ul><li aria-level="1"><p>One</p></li></ul><ul><li aria-level="2"><p>Nested</p></li></ul><ul><li aria-level="1"><p>Two</p></li></ul>' +
  '</b>'

const WORD =
  '<html xmlns:o="urn:schemas-microsoft-com:office:office"><body>' +
  '<p class="MsoListParagraphCxSpFirst" style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">·<span>&nbsp;&nbsp;</span></span>First</p>' +
  '<p class="MsoListParagraphCxSpMiddle" style="mso-list:l0 level2 lfo1"><span style="mso-list:Ignore">o<span>&nbsp;</span></span>Second level</p>' +
  '<p class="MsoListParagraphCxSpLast" style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">·</span>Third</p>' +
  '<p class="MsoNormal">After</p></body></html>'

const APPLE =
  '<meta name="Generator" content="Cocoa HTML Writer"><p class="p1"><b><span style="font-size:24px">Big title</span></b></p><p class="p2">Body</p>'

const CHATGPT =
  '<div class="markdown prose"><h3>Plan</h3><ol><li>Read</li><li>Write<ul><li>draft</li></ul></li></ol><pre><code class="language-js">let a = 1\n</code></pre><hr><p><strong>Note:</strong> done <s>old</s> <u>kept</u></p></div>'

const MD =
  '## Steps\n\n- **Plan:** write it\n- Do it\n\n| Level | Tool |\n| --- | --- |\n| 1 | None |\n| 2 | Search |\n\n- [ ] todo\n- [x] done\n\n> quote\n\n```js\nlet a = 1\n```\n\n[Link](https://example.com)'

const TREE =
  'project/\n├── src/\n│   ├── main.ts\n│   └── util.ts\n└── README.md'

async function insertPlan(plan: ReturnType<typeof planPaste>) {
  const editor = BlockNoteEditor.create({ schema })
  editor.mount(document.createElement('div'))
  if (plan!.kind === 'html') {
    // jsdom has no ClipboardEvent (pasteHTML needs one): parse instead.
    const blocks = await editor.tryParseHTMLToBlocks(plan!.html!)
    editor.replaceBlocks(editor.document, blocks)
  } else await applyPaste(editor, plan!, 'keep')
  return editor.document
}

const flat = (blocks: { type: string; children?: unknown[] }[]): string[] =>
  blocks.flatMap((b) => [
    b.type,
    ...flat((b.children ?? []) as { type: string; children?: unknown[] }[]),
  ])

describe('source detection', () => {
  it('recognises each source', () => {
    expect(detectSource(GDOCS)).toBe('gdocs')
    expect(detectSource(WORD)).toBe('word')
    expect(detectSource(GEMINI)).toBe('chat')
    expect(detectSource(APPLE)).toBe('apple')
    expect(detectSource('<p>hi</p>')).toBe('web')
  })
})

describe('Gemini / AI chat HTML', () => {
  it('keeps headings, bold labels, lists, table, quote, link, code and emoji', async () => {
    const plan = planPaste({ html: GEMINI, text: 'x\ny', own: false })
    expect(plan?.kind).toBe('html')
    const types = flat((await insertPlan(plan)) as never)
    expect(types).toContain('heading')
    expect(types).toContain('bulletListItem')
    expect(types).toContain('table')
    expect(types).toContain('quote')
    expect(types).toContain('codeBlock')
    const html = plan!.html!
    expect(html).toContain('<b>Goal:</b>')
    expect(html).toContain('✅')
    expect(html).toContain('<code>no tools</code>')
    expect(html).toContain('href="https://example.com/agents"')
    expect(html).not.toContain('Copy') // code block decoration is dropped
  })
  it('falls back to Markdown when the HTML is flat but the text is Markdown', () => {
    const plan = planPaste({
      html: '<p>## Steps</p><p>- **Plan:** write it</p><p>- Do it</p>',
      text: MD,
      own: false,
    })
    expect(plan?.kind).toBe('markdown')
  })
})

describe('Google Docs, Word, Apple Notes, ChatGPT HTML', () => {
  it('Google Docs: styles become marks, flat list items nest', () => {
    const clean = sanitizePastedHtml(GDOCS)
    expect(clean).toContain('<strong>bold</strong>')
    expect(clean).toContain('<em>italic</em>')
    expect(clean).toContain('<u>under</u>')
    expect(clean).toContain('<s>gone</s>')
    expect(clean).toContain('<h1')
    expect(clean).not.toContain('docs-internal')
    // One list holding One(Nested) and Two.
    expect((clean.match(/<ul>/g) ?? []).length).toBe(2)
    expect(clean.indexOf('Nested')).toBeGreaterThan(clean.indexOf('One'))
    expect(clean.indexOf('Nested')).toBeLessThan(clean.indexOf('Two'))
  })
  it('Word: mso list paragraphs become nested lists without bullet glyphs', () => {
    const clean = sanitizePastedHtml(WORD)
    expect(clean).toContain('<li>First<ul><li>Second level</li></ul></li>')
    expect(clean).toContain('<li>Third</li>')
    expect(clean).not.toContain('·')
    expect(clean).toContain('After')
  })
  it('Apple Notes: a large bold line becomes a heading', () => {
    expect(sanitizePastedHtml(APPLE)).toContain('<h1>Big title</h1>')
  })
  it('ChatGPT: nested lists, code, divider, strikethrough', async () => {
    const plan = planPaste({ html: CHATGPT, text: 'Plan', own: false })
    const types = flat((await insertPlan(plan)) as never)
    expect(types).toEqual(
      expect.arrayContaining([
        'heading',
        'numberedListItem',
        'bulletListItem',
        'codeBlock',
        'divider',
      ]),
    )
    expect(plan!.html).toContain('<s>old</s>')
  })
  it('strips scripts and handlers from every source', () => {
    const clean = sanitizePastedHtml(
      '<message-content onclick="x()"><script>1</script><p style="color:red" onmouseover="y()">a<iframe src="https://e"></iframe></p></message-content>',
    )
    expect(clean).not.toMatch(/script|onclick|onmouseover|iframe|style/)
  })
})

describe('Markdown text', () => {
  it('is recognised and parsed with tables, tasks, quote, code and link', async () => {
    expect(looksLikeMarkdown(MD)).toBe(true)
    expect(looksLikeMarkdown('just a sentence, nothing special.')).toBe(false)
    const plan = planPaste({ html: '', text: MD, own: false })
    expect(plan?.kind).toBe('markdown')
    const types = flat((await insertPlan(plan)) as never)
    expect(types).toEqual(
      expect.arrayContaining([
        'heading',
        'bulletListItem',
        'table',
        'checkListItem',
        'quote',
        'codeBlock',
      ]),
    )
  })
  it('reads pipe tables as rows', () => {
    expect(markdownTableRows(MD)).toEqual([
      ['Level', 'Tool'],
      ['1', 'None'],
      ['2', 'Search'],
    ])
  })
  it('offers "As table" for a Markdown table and previews it', () => {
    const plan = planPaste({ html: '', text: MD, own: false })!
    expect(choicesFor(plan)).toEqual(['keep', 'plain', 'table'])
    expect(previewOf(plan, 'table')).toContain('3 rows')
  })
})

describe('tree drawings', () => {
  it('stay in a code block with their spacing', async () => {
    const plan = planPaste({ html: '', text: TREE, own: false })
    expect(plan?.kind).toBe('tree')
    const doc = await insertPlan(plan)
    const code = doc.find((b) => b.type === 'codeBlock')!
    const text = (code.content as { text: string }[])[0].text
    expect(text).toContain('│   ├── main.ts')
    expect(text.split('\n')).toHaveLength(5)
  })
  it('are fenced inside Markdown that forgot the fence', () => {
    const fenced = fenceTrees('## Layout\n\n' + TREE + '\n\nDone')
    expect(fenced).toContain('```\nproject/\n├── src/')
    expect(fenced.match(/```/g)).toHaveLength(2)
  })
  it('keep text around the tree as lines', () => {
    const seg = treeSegments('Before\n' + TREE + '\nAfter')!
    expect(seg.some((s) => !s.code && s.text.includes('Before'))).toBe(true)
    expect(seg.some((s) => s.code)).toBe(true)
  })
})

describe('Notion database rows', () => {
  const rowsHtml =
    '<table class="collection-content"><thead><tr><th>Name</th><th>Tags</th></tr></thead><tbody>' +
    '<tr><td>📄 Alpha</td><td>a</td></tr><tr><td>Beta</td><td>b</td></tr></tbody></table>'
  it('become a Database plan with the emoji kept and the first column as title', () => {
    const plan = planPaste({ html: rowsHtml, text: 'x', own: false })
    expect(plan?.kind).toBe('database')
    expect(plan?.header).toEqual(['Name', 'Tags'])
    expect(plan?.rows?.[0][0]).toBe('📄 Alpha')
  })
  it('plain tab-separated text stays a Table', () => {
    const plan = planPaste({
      html: '',
      text: '📄 Alpha\ta\nBeta\tb',
      own: false,
    })
    expect(plan?.kind).toBe('table')
  })
  it('tab text with Notion html and no table markers is a Database too', () => {
    const plan = planPaste({
      html: '<div data-block-id="abc" class="notion-selectable">x</div>',
      text: '📄 Alpha\ta\nBeta\tb',
      own: false,
    })
    expect(plan?.kind).toBe('database')
  })
  it('our own copies are left to the default handler', () => {
    expect(planPaste({ html: '<p>x</p>', text: 'x', own: true })).toBeNull()
  })
})

describe('a lone address', () => {
  const url = 'https://youtu.be/dQw4w9WgXcQ?t=30'
  it('is an embed plan with Embed, Link and Plain URL choices', async () => {
    const plan = planPaste({ html: '', text: url, own: false })
    expect(plan?.kind).toBe('url')
    expect(choicesFor(plan!)).toEqual(['keep', 'link', 'plain'])
    expect(labelKey(plan!, 'keep')).toBe('pasteChooser.embed')
    const doc = await insertPlan(plan)
    const embed = doc.find((b) => b.type === 'embed')!
    expect(embed.props).toMatchObject({
      provider: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      start: 30,
    })
  })
  it('a web page is a link card; an HTML link with the same words too', () => {
    const plan = planPaste({
      html: '<a href="https://example.com/a">https://example.com/a</a>',
      text: 'https://example.com/a',
      own: false,
    })
    expect(plan?.kind).toBe('url')
    expect(labelKey(plan!, 'keep')).toBe('pasteChooser.linkCard')
  })
  it('a sentence with a link in it is not a lone address', () => {
    expect(
      planPaste({
        html: '',
        text: 'see https://example.com/a now',
        own: false,
      }),
    ).toBeNull()
  })
})
