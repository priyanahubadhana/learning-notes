import { describe, expect, it } from 'vitest'
import { openRecord, remoteId } from '../../src/sync/crypto'
import { parseHlc } from '../../src/sync/hlc'
import { fromWire } from '../../src/sync/wire'
import { NotesCache } from '../src/cache'
import { parseConfig, type Scopes } from '../src/config'
import { markdownToBlocks } from '../src/mdParse'
import { REVOKED_MESSAGE, RevokedError } from '../src/source'
import { makeTools } from '../src/tools'
import { makeWriteTools } from '../src/writeTools'
import { newFixture, seedNotes } from './fixture'

const NOW = 1_700_000_000_000
const ALL: Scopes = { read: true, 'write:append': true, 'write:create': true }
const DEVICE = 'mcp-testpc'

async function setup(scopes: Scopes = ALL) {
  const { master, source } = await newFixture()
  await seedNotes(source, NOW)
  let clock = 0
  const cache = new NotesCache(source, master, { now: () => clock })
  let n = 0
  const write = makeWriteTools({
    cache,
    source,
    master,
    deviceId: DEVICE,
    scopes,
    now: () => NOW,
    newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  })
  const read = makeTools(cache, () => NOW)
  // What the app would see: every pushed row opened with the key.
  const opened = async () =>
    Promise.all(
      source.pushed.map(async (it) => {
        const rev = it.baseRev + 1
        const o = await openRecord(master, it.id, rev, it)
        const env = o.value as {
          f: number
          h: string
          d: string
          r: Record<string, unknown>
        }
        return {
          table: o.table,
          id: o.id,
          env,
          rec: fromWire(env.r) as Record<string, unknown>,
        }
      }),
    )
  return {
    master,
    source,
    cache,
    write,
    read,
    opened,
    advance: (ms: number) => (clock += ms),
  }
}

const SPEC = {
  version: 'ln-spec/1',
  title: 'Chemistry',
  summary: 'Atoms and bonds',
  pages: [
    {
      title: 'Atoms',
      blocks: [
        { type: 'heading', level: 1, text: 'Atoms' },
        { type: 'paragraph', text: 'An **atom** has a nucleus.' },
      ],
    },
    { title: 'Bonds', blocks: [{ type: 'bulletListItem', text: 'Ionic' }] },
  ],
  cards: [
    {
      kind: 'qa',
      q: 'What is an atom?',
      a: 'The smallest unit',
      page: 'Atoms',
    },
    { kind: 'cloze', text: 'The {{nucleus}} holds protons', page: 'Atoms' },
  ],
}

const aPage = { title: 'a', blocks: [{ type: 'paragraph', text: 'b' }] }

describe('create_notebook', () => {
  it('saves sealed records the app can open, stamped as this device', async () => {
    const s = await setup()
    const out = await s.write.create_notebook({ spec: SPEC })
    expect(out).toMatchObject({ pages: 2, cards: 2 })
    const recs = await s.opened()
    const tables = recs.map((r) => r.table)
    expect(tables.filter((x) => x === 'notebooks')).toHaveLength(1)
    expect(tables.filter((x) => x === 'pages')).toHaveLength(2)
    // The notebook is last, so a stop half way leaves nothing visible.
    expect(tables[tables.length - 1]).toBe('notebooks')
    const nb = recs.find((r) => r.table === 'notebooks')!
    expect(nb.rec).toMatchObject({
      title: 'Chemistry',
      workspaceId: 'ws1',
      allowAi: true,
      deletedAt: null,
    })
    for (const r of recs) {
      expect(r.env.f).toBe(1)
      expect(r.env.d).toBe(DEVICE)
      expect(parseHlc(r.env.h)?.deviceId).toBe(DEVICE)
      expect(r.env.r.id).toBe(r.id)
    }
    // Server ids are the hashed ids, never the plain ones.
    expect(
      s.source.rows.some((r) => r.id === remoteId('notebooks', nb.id)),
    ).toBe(true)
    // Marked as an AI result.
    const block = recs.find((r) => r.table === 'blocks')!
    expect(block.rec).toMatchObject({ source: 'ai' })
  })

  it('stamps are strictly increasing within one call', async () => {
    const s = await setup()
    await s.write.create_notebook({ spec: SPEC })
    const hs = (await s.opened()).map((r) => r.env.h)
    expect([...hs].sort()).toEqual(hs)
    expect(new Set(hs).size).toBe(hs.length)
  })

  it('can be read back, and sorts after every notebook (hidden ones too)', async () => {
    const s = await setup()
    const out = (await s.write.create_notebook({ spec: SPEC })) as {
      notebookId: string
    }
    const list = await s.read.list_notebooks()
    expect(list.notebooks.map((n) => n.title)).toContain('Chemistry')
    const nb = (await s.opened()).find((r) => r.table === 'notebooks')!
    expect(String(nb.rec.order) > 'a2').toBe(true)
    expect(nb.id).toBe(out.notebookId)
    const pages = await s.read.list_pages({ notebookId: out.notebookId })
    expect(pages.pages.map((p) => p.title)).toEqual(['Atoms', 'Bonds'])
  })

  it('refuses a bad spec with the exact place and writes nothing', async () => {
    const s = await setup()
    const bad = structuredClone(SPEC)
    ;(bad.pages[0].blocks[0] as { level: number }).level = 9
    await expect(s.write.create_notebook({ spec: bad })).rejects.toThrow(
      /\/pages\/0\/blocks\/0\/level/,
    )
    expect(s.source.pushed).toHaveLength(0)
    expect(s.source.audits).toHaveLength(0)
  })

  it('refuses mind maps and databases, writing nothing', async () => {
    const s = await setup()
    const spec = structuredClone(SPEC) as Record<string, unknown>
    spec.pages = [{ title: 'M', blocks: [{ type: 'mindMap', outline: '- a' }] }]
    spec.cards = []
    await expect(s.write.create_notebook({ spec })).rejects.toThrow(
      /cannot make yet/,
    )
    expect(s.source.pushed).toHaveLength(0)
    // (the online connector makes them: see src/connector/claudeTools.test.ts)
  })

  it('needs a synced workspace', async () => {
    const s = await setup()
    s.source.rows = []
    await expect(s.write.create_notebook({ spec: SPEC })).rejects.toThrow(
      /Open Learning Notes once/,
    )
  })

  it('writes one audit line with ids and counts but no content', async () => {
    const s = await setup()
    await s.write.create_notebook({ spec: SPEC })
    expect(s.source.audits).toHaveLength(1)
    const a = s.source.audits[0]
    expect(a.tool).toBe('create_notebook')
    expect(a.counts).toMatchObject({ pages: 2, cards: 2 })
    expect(JSON.stringify(a)).not.toMatch(/atom|nucleus|Chemistry/i)
  })

  it('a failed audit does not undo the save, and says so', async () => {
    const s = await setup()
    s.source.failAudit = true
    const out = (await s.write.create_notebook({ spec: SPEC })) as {
      audit?: string
    }
    expect(out.audit).toMatch(/audit line could not be written/)
    expect(s.source.pushed.length).toBeGreaterThan(0)
  })
})

describe('add_page', () => {
  it('adds a page after the hidden and removed siblings', async () => {
    const s = await setup()
    const out = (await s.write.add_page({
      notebookId: 'nb1',
      page: {
        title: 'Ribosomes',
        blocks: [{ type: 'paragraph', text: 'Make protein' }],
      },
    })) as { pageId: string }
    const page = (await s.opened()).find((r) => r.table === 'pages')!
    expect(page.id).toBe(out.pageId)
    // Siblings are a0, a1 (locked), a2 (removed), a3 (paused): all count.
    expect(String(page.rec.order) > 'a3').toBe(true)
    expect(page.rec).toMatchObject({ notebookId: 'nb1', parentId: null })
  })

  it('refuses a notebook Claude may not use, or one locked against edits', async () => {
    const s = await setup()
    await expect(
      s.write.add_page({ notebookId: 'nb2', page: aPage }),
    ).rejects.toThrow(/No such notebook/)
    await expect(
      s.write.add_page({ notebookId: 'nb3', page: aPage }),
    ).rejects.toThrow(/locked/)
    await s.source.put('notebooks', {
      id: 'nb4',
      title: 'Frozen',
      order: 'a5',
      allowAi: true,
      editLocked: true,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    })
    await expect(
      s.write.add_page({ notebookId: 'nb4', page: aPage }),
    ).rejects.toThrow(/locked against edits/)
    expect(s.source.pushed).toHaveLength(0)
  })

  it('checks the parent and its version', async () => {
    const s = await setup()
    await expect(
      s.write.add_page({ notebookId: 'nb1', page: aPage, parentId: 'p5' }),
    ).rejects.toThrow(/No such parent/)
    await expect(
      s.write.add_page({
        notebookId: 'nb1',
        page: aPage,
        parentId: 'p1',
        parentVersion: 'stale',
      }),
    ).rejects.toThrow(/changed since you read it/)
    const v = (await s.read.read_page({ pageId: 'p1' })).version
    await s.write.add_page({
      notebookId: 'nb1',
      page: aPage,
      parentId: 'p1',
      parentVersion: v,
    })
    expect(s.source.pushed.length).toBeGreaterThan(0)
  })
})

describe('append_to_page', () => {
  const md =
    '## New part\n\nSome **bold** text.\n\n- one\n  - nested\n- [x] done'

  it('adds blocks at the end, keeps what exists, and changes the version', async () => {
    const s = await setup()
    const before = await s.read.read_page({ pageId: 'p1' })
    const out = (await s.write.append_to_page({
      pageId: 'p1',
      markdown: md,
      expectedVersion: before.version,
    })) as { added: { blocks: number }; version: string }
    expect(out.added.blocks).toBe(5)
    expect(out.version).not.toBe(before.version)
    const after = await s.read.read_page({ pageId: 'p1' })
    expect(after.markdown.startsWith(before.markdown)).toBe(true)
    expect(after.markdown).toContain('## New part')
    expect(after.markdown).toContain('**bold**')
    expect(after.markdown.indexOf('## New part')).toBeGreaterThan(
      after.markdown.indexOf('removed text'),
    )
    const recs = await s.opened()
    // The page was touched (rev 2, same fields, newer) and 5 new blocks added.
    const page = recs.find((r) => r.table === 'pages')!
    expect(page.rec).toMatchObject({ id: 'p1', title: 'Cells', updatedAt: NOW })
    expect(
      s.source.rows.find((r) => r.id === remoteId('pages', 'p1'))?.rev,
    ).toBe(2)
    const blocks = recs.filter((r) => r.table === 'blocks')
    expect(blocks).toHaveLength(5)
    for (const b of blocks)
      expect(b.rec).toMatchObject({ pageId: 'p1', source: 'ai' })
    // Orders are after every existing top-level block (a9 is the last).
    const tops = blocks.filter((b) => b.rec.parentId === null)
    expect(tops).toHaveLength(4)
    for (const b of tops) expect(String(b.rec.order) > 'a9').toBe(true)
  })

  it('the page record is stamped after the one it replaces', async () => {
    const s = await setup()
    await s.source.put('pages', {
      id: 'p9',
      notebookId: 'nb1',
      parentId: null,
      title: 'Future',
      order: 'a9',
      createdAt: 1,
      updatedAt: 5,
      deletedAt: null,
    })
    const v = (await s.read.read_page({ pageId: 'p9' })).version
    await s.write.append_to_page({
      pageId: 'p9',
      markdown: 'hello',
      expectedVersion: v,
    })
    const touch = (await s.opened()).find((r) => r.table === 'pages')!
    expect(touch.env.h > '000000000000001-000000-dev').toBe(true)
  })

  it('refuses a stale version and writes nothing', async () => {
    const s = await setup()
    await expect(
      s.write.append_to_page({
        pageId: 'p1',
        markdown: 'x',
        expectedVersion: 'old',
      }),
    ).rejects.toThrow(/changed since you read it/)
    expect(s.source.pushed).toHaveLength(0)
    expect(s.source.audits).toHaveLength(0)
  })

  it('a second append with the old version is a conflict', async () => {
    const s = await setup()
    const v = (await s.read.read_page({ pageId: 'p1' })).version
    await s.write.append_to_page({
      pageId: 'p1',
      markdown: 'first',
      expectedVersion: v,
    })
    await expect(
      s.write.append_to_page({
        pageId: 'p1',
        markdown: 'second',
        expectedVersion: v,
      }),
    ).rejects.toThrow(/changed since you read it/)
    const now = await s.read.read_page({ pageId: 'p1' })
    expect(now.markdown).toContain('first')
    expect(now.markdown).not.toContain('second')
  })

  it('a save by another device between the check and the save adds nothing', async () => {
    const s = await setup()
    const v = (await s.read.read_page({ pageId: 'p1' })).version
    // The person edits the page in the app right now.
    s.source.beforePush = async () => {
      s.source.beforePush = null
      await s.source.put('pages', {
        id: 'p1',
        notebookId: 'nb1',
        parentId: null,
        title: 'Cells (edited)',
        order: 'a0',
        createdAt: 1,
        updatedAt: 2000,
        deletedAt: null,
      })
    }
    await expect(
      s.write.append_to_page({
        pageId: 'p1',
        markdown: 'late',
        expectedVersion: v,
      }),
    ).rejects.toThrow(/changed while saving/)
    expect(s.source.pushed).toHaveLength(0)
    expect(s.source.audits).toHaveLength(0)
  })

  it('refuses pages Claude may not use', async () => {
    const s = await setup()
    for (const pageId of ['p3', 'p5', 'p6', 'p4', 'nope'])
      await expect(
        s.write.append_to_page({ pageId, markdown: 'x', expectedVersion: 'v' }),
      ).rejects.toThrow(/No such page/)
    expect(s.source.pushed).toHaveLength(0)
  })

  it('refuses an edit-locked page', async () => {
    const s = await setup()
    await s.source.put('pages', {
      id: 'p8',
      notebookId: 'nb1',
      parentId: null,
      title: 'Frozen page',
      order: 'a8',
      editLocked: true,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    })
    const v = (await s.read.read_page({ pageId: 'p8' })).version
    await expect(
      s.write.append_to_page({
        pageId: 'p8',
        markdown: 'x',
        expectedVersion: v,
      }),
    ).rejects.toThrow(/locked against edits/)
    expect(s.source.pushed).toHaveLength(0)
  })

  it('refuses empty or oversized Markdown, writing nothing', async () => {
    const s = await setup()
    const v = (await s.read.read_page({ pageId: 'p1' })).version
    await expect(
      s.write.append_to_page({
        pageId: 'p1',
        markdown: '   \n',
        expectedVersion: v,
      }),
    ).rejects.toThrow(/nothing to add/)
    const big = Array.from({ length: 250 }, (_, i) => `line ${i}`).join('\n\n')
    await expect(
      s.write.append_to_page({
        pageId: 'p1',
        markdown: big,
        expectedVersion: v,
      }),
    ).rejects.toThrow(/not valid/)
    expect(s.source.pushed).toHaveLength(0)
  })

  it('text that looks like markup stays text', async () => {
    const s = await setup()
    const v = (await s.read.read_page({ pageId: 'p1' })).version
    await s.write.append_to_page({
      pageId: 'p1',
      markdown:
        '<script>alert(1)</script> [x](javascript:alert(1)) [ok](https://example.org)',
      expectedVersion: v,
    })
    const b = (await s.opened()).find((r) => r.table === 'blocks')!
    const json = JSON.stringify(b.rec.content)
    expect(json).toContain('<script>alert(1)</script>')
    expect(json).not.toContain('"href":"javascript')
    expect(json).toContain('"href":"https://example.org"')
  })
})

describe('add_cards', () => {
  const cards = [
    { kind: 'qa', q: 'Powerhouse?', a: 'Mitochondria' },
    { kind: 'cloze', text: 'The {{nucleus}} holds {{DNA}}' },
  ]

  it('adds a Recall cards section with card records, once', async () => {
    const s = await setup()
    let v = (await s.read.read_page({ pageId: 'p2' })).version
    const out = (await s.write.add_cards({
      pageId: 'p2',
      cards,
      expectedVersion: v,
    })) as { added: { blocks: number; cards: number }; version: string }
    // heading + qa card + its answer + cloze paragraph = 4 blocks; 1 + 2 cards.
    expect(out.added).toEqual({ blocks: 4, cards: 3 })
    const recs = await s.opened()
    for (const c of recs.filter((r) => r.table === 'cards'))
      expect(c.rec).toMatchObject({
        pageId: 'p2',
        notebookId: 'nb1',
        reps: 0,
        suspendedAt: null,
      })
    const listed = await s.read.list_cards({ pageId: 'p2' })
    expect(listed.cards.map((c) => c.question)).toContain('Powerhouse?')
    // A second call adds cards but not a second heading.
    v = out.version
    await s.write.add_cards({
      pageId: 'p2',
      cards: [cards[0]],
      expectedVersion: v,
    })
    const md = (await s.read.read_page({ pageId: 'p2' })).markdown
    expect(md.match(/## Recall cards/g)).toHaveLength(1)
  })

  it('refuses a bad card with its place and writes nothing', async () => {
    const s = await setup()
    const v = (await s.read.read_page({ pageId: 'p2' })).version
    await expect(
      s.write.add_cards({
        pageId: 'p2',
        cards: [{ kind: 'cloze', text: 'no blanks here' }],
        expectedVersion: v,
      }),
    ).rejects.toThrow(/\/cards\/0/)
    expect(s.source.pushed).toHaveLength(0)
  })
})

describe('revoked device', () => {
  it('refuses every read and write, and forgets what it held', async () => {
    const s = await setup()
    await s.read.list_notebooks() // fills the cache
    const v = (await s.read.read_page({ pageId: 'p1' })).version
    s.source.state = 'revoked'
    s.advance(60_000)
    await expect(s.read.list_notebooks()).rejects.toThrow(REVOKED_MESSAGE)
    await expect(s.read.read_page({ pageId: 'p1' })).rejects.toBeInstanceOf(
      RevokedError,
    )
    await expect(s.write.create_notebook({ spec: SPEC })).rejects.toThrow(
      /revoked/,
    )
    await expect(
      s.write.append_to_page({
        pageId: 'p1',
        markdown: 'x',
        expectedVersion: v,
      }),
    ).rejects.toThrow(/revoked/)
    await expect(
      s.write.add_page({ notebookId: 'nb1', page: aPage }),
    ).rejects.toThrow(/revoked/)
    expect(s.source.pushed).toHaveLength(0)
    // The old notes were dropped, not kept for later.
    expect(s.cache.notebooks()).toHaveLength(0)
  })

  it('a revoke that lands during a save stops the save', async () => {
    const s = await setup()
    s.source.beforePush = async () => {
      s.source.state = 'revoked'
    }
    await expect(s.write.create_notebook({ spec: SPEC })).rejects.toThrow(
      /revoked/,
    )
    expect(s.source.pushed).toHaveLength(0)
  })
})

describe('scopes', () => {
  it('everything is on by default, and the config file can switch parts off', () => {
    expect(parseConfig(null, 'My-PC').scopes).toEqual(ALL)
    expect(parseConfig(null, 'My-PC').deviceId).toBe('mcp-mypc')
    expect(parseConfig('{}').scopes).toEqual(ALL)
    expect(parseConfig('{"scopes":{"write:create":false}}').scopes).toEqual({
      read: true,
      'write:append': true,
      'write:create': false,
    })
  })

  it('a broken or odd config never turns anything on', () => {
    for (const bad of ['{nope', '[]', '"x"', '{"scopes":[]}']) {
      const c = parseConfig(bad)
      expect(c.scopes).toEqual({
        read: true,
        'write:append': false,
        'write:create': false,
      })
      expect(c.problems.length).toBeGreaterThan(0)
    }
    const odd = parseConfig(
      '{"scopes":{"read":"yes","write:create":1,"delete":true}}',
    )
    expect(odd.scopes.read).toBe(false)
    expect(odd.scopes['write:create']).toBe(false)
    expect(odd.problems.join(' ')).toMatch(/Unknown scope "delete"/)
  })

  it('appending needs reading', () => {
    const c = parseConfig('{"scopes":{"read":false}}')
    expect(c.scopes).toEqual({
      read: false,
      'write:append': false,
      'write:create': true,
    })
    expect(c.problems.join(' ')).toMatch(/needs "read"/)
  })

  it('the device id must look like mcp-...', () => {
    expect(parseConfig('{"deviceId":"mcp-desk"}').deviceId).toBe('mcp-desk')
    const c = parseConfig('{"deviceId":"../evil"}', 'Box')
    expect(c.deviceId).toBe('mcp-box')
    expect(c.problems).toHaveLength(1)
  })

  it('a tool whose scope is off refuses even if called directly, writing nothing', async () => {
    const s = await setup({
      read: true,
      'write:append': false,
      'write:create': false,
    })
    await expect(s.write.create_notebook({ spec: SPEC })).rejects.toThrow(
      /switched off/,
    )
    await expect(
      s.write.add_page({ notebookId: 'nb1', page: aPage }),
    ).rejects.toThrow(/write:create/)
    await expect(
      s.write.append_to_page({
        pageId: 'p1',
        markdown: 'x',
        expectedVersion: 'v',
      }),
    ).rejects.toThrow(/write:append/)
    await expect(
      s.write.add_cards({ pageId: 'p1', cards: [], expectedVersion: 'v' }),
    ).rejects.toThrow(/write:append/)
    expect(s.source.pushed).toHaveLength(0)
  })
})

describe('markdownToBlocks', () => {
  it('reads the common shapes', () => {
    const b = markdownToBlocks(
      '# T\n\npara one\nstill one\n\n1. a\n2. b\n\n> q1\n> q2\n\n---\n\n```js\nlet a = 1\n```\n\n| H1 | H2 |\n|---|---|\n| x | y |\n\n- [ ] todo\n- [x] done',
    )
    expect(b.map((x) => x.type)).toEqual([
      'heading',
      'paragraph',
      'numberedListItem',
      'numberedListItem',
      'quote',
      'divider',
      'codeBlock',
      'table',
      'checkListItem',
      'checkListItem',
    ])
    expect(b[1].text).toBe('para one still one')
    expect(b[4].text).toBe('q1\nq2')
    expect(b[6]).toMatchObject({ language: 'js', text: 'let a = 1' })
    expect(b[7].rows).toEqual([
      ['H1', 'H2'],
      ['x', 'y'],
    ])
    expect(b[8].checked).toBe(false)
    expect(b[9].checked).toBe(true)
  })

  it('nests lists by indent and caps heading depth', () => {
    const b = markdownToBlocks('- a\n  - b\n    - c\n- d\n\n#### deep')
    expect(b).toHaveLength(3)
    expect(b[0].children?.[0].children?.[0].text).toBe('c')
    expect(b[1].text).toBe('d')
    expect(b[2]).toMatchObject({ type: 'heading', level: 3, text: 'deep' })
  })

  it('never throws on junk', () => {
    for (const s of [
      '',
      '```',
      '|',
      '>',
      '- ',
      '\u0000',
      '#',
      '| a\n|---',
      '***',
    ])
      expect(() => markdownToBlocks(s)).not.toThrow()
  })
})
