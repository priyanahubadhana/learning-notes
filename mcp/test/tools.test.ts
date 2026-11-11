import { describe, expect, it } from 'vitest'
import { createMasterKey } from '../../src/sync/crypto'
import { NotesCache } from '../src/cache'
import { makeTools, ToolError } from '../src/tools'
import { newFixture, seedNotes, t } from './fixture'

const NOW = 1_000_000

async function setup(opts: { readAll?: boolean } = {}) {
  const { master, source } = await newFixture()
  await seedNotes(source, NOW)
  let clock = 0
  const cache = new NotesCache(source, master, { ...opts, now: () => clock })
  const tools = makeTools(cache, () => NOW)
  return {
    master,
    source,
    cache,
    tools,
    advance: (ms: number) => (clock += ms),
  }
}

describe('list_notebooks', () => {
  it('shows only notebooks with Allow AI on, and says how many are hidden', async () => {
    const { tools } = await setup()
    const out = await tools.list_notebooks()
    expect(out.notebooks.map((n) => n.title)).toEqual([
      'Biology',
      'Locked but shared',
    ])
    expect(out.note).toMatch(/1 notebook/)
  })

  it('counts only readable pages', async () => {
    const { tools } = await setup()
    const bio = (await tools.list_notebooks()).notebooks.find(
      (n) => n.id === 'nb1',
    )!
    // p1, p2, p7 (p3 is locked, p4 is deleted)
    expect(bio.pageCount).toBe(3)
  })

  it('LN_MCP_READ_ALL opens every live notebook', async () => {
    const { tools } = await setup({ readAll: true })
    const out = await tools.list_notebooks()
    expect(out.notebooks).toHaveLength(3)
    expect(out.note).toBeUndefined()
  })
})

describe('list_pages', () => {
  it('lists readable pages, never deleted or locked ones', async () => {
    const { tools } = await setup()
    const out = await tools.list_pages({ notebookId: 'nb1' })
    expect(out.pages.map((p) => p.title).sort()).toEqual([
      'Cells',
      'Mitochondria',
      'Paused',
    ])
  })

  it('filters by parent', async () => {
    const { tools } = await setup()
    expect(
      (await tools.list_pages({ notebookId: 'nb1', parentId: 'p1' })).pages.map(
        (p) => p.id,
      ),
    ).toEqual(['p2'])
    expect(
      (await tools.list_pages({ notebookId: 'nb1', parentId: null })).pages
        .map((p) => p.id)
        .sort(),
    ).toEqual(['p1', 'p7'])
  })

  it('refuses a notebook Claude may not read', async () => {
    const { tools } = await setup()
    await expect(
      tools.list_pages({ notebookId: 'nb2' }),
    ).rejects.toBeInstanceOf(ToolError)
    await expect(
      tools.list_pages({ notebookId: 'nope' }),
    ).rejects.toBeInstanceOf(ToolError)
  })

  it('hides pages of a locked notebook unless Allow AI while locked is on', async () => {
    const { tools } = await setup()
    expect((await tools.list_pages({ notebookId: 'nb3' })).pages).toEqual([])
  })
})

describe('read_page', () => {
  it('gives Markdown and a version', async () => {
    const { tools } = await setup()
    const out = await tools.read_page({ pageId: 'p1' })
    expect(out.title).toBe('Cells')
    expect(out.version).toMatch(/^[0-9a-f]{16}$/)
    expect(out.markdown).toContain('# The cell')
    expect(out.markdown).toContain(
      'The cell is the **basic unit** of life, see [here](https://example.org)',
    )
    expect(out.markdown).toContain('- Nucleus\n  - Membrane')
    expect(out.markdown).toContain('- [x] Revise')
    expect(out.markdown).toContain('1. one\n2. two')
    expect(out.markdown).toContain('**Card.** Question: What makes ATP?')
    expect(out.markdown).toContain('```js\nlet a = 1\n```')
    expect(out.markdown).toContain('| H1 | H2 |\n| --- | --- |\n| a | b |')
    expect(out.markdown).not.toContain('gone')
  })

  it('refuses locked, deleted, hidden-notebook and unknown pages', async () => {
    const { tools } = await setup()
    for (const pageId of ['p3', 'p4', 'p5', 'p6', 'nope'])
      await expect(tools.read_page({ pageId })).rejects.toBeInstanceOf(
        ToolError,
      )
  })

  it('the version changes when a block changes, and not otherwise', async () => {
    const { tools, source, advance } = await setup()
    const v1 = (await tools.read_page({ pageId: 'p1' })).version
    advance(20_000)
    expect((await tools.read_page({ pageId: 'p1' })).version).toBe(v1)
    await source.put('blocks', {
      id: 'b2',
      createdAt: 1,
      updatedAt: 2000,
      deletedAt: null,
      pageId: 'p1',
      parentId: null,
      type: 'paragraph',
      order: 'a1',
      content: { text: [t('edited')] },
    })
    advance(20_000)
    const after = await tools.read_page({ pageId: 'p1' })
    expect(after.version).not.toBe(v1)
    expect(after.markdown).toContain('edited')
  })
})

describe('search_notes', () => {
  it('finds by title and text, ignoring case and accents', async () => {
    const { tools } = await setup()
    expect(
      (await tools.search_notes({ query: 'MITOCHONDRIA' })).results
        .map((r) => (r as { pageId: string }).pageId)
        .sort(),
    ).toEqual(['p1', 'p2'])
    const one = (await tools.search_notes({ query: 'basic unit' })).results
    expect(one).toHaveLength(1)
    expect((one[0] as { snippet: string }).snippet).toContain('basic unit')
  })

  it('never returns hidden pages', async () => {
    const { tools } = await setup()
    expect((await tools.search_notes({ query: 'diary' })).results).toEqual([])
    expect(
      (await tools.search_notes({ query: 'hidden words' })).results,
    ).toEqual([])
  })

  it('needs words, and respects the limit', async () => {
    const { tools } = await setup()
    await expect(tools.search_notes({ query: '  ' })).rejects.toBeInstanceOf(
      ToolError,
    )
    expect(
      (await tools.search_notes({ query: 'cell', limit: 1 })).results,
    ).toHaveLength(1)
  })
})

describe('cards', () => {
  it('list_cards gives question and answer, skipping hidden pages', async () => {
    const { tools } = await setup()
    const out = await tools.list_cards({})
    const ids = out.cards.map((c) => c.id).sort()
    expect(ids).toEqual(['c1', 'c2', 'c3'])
    const c1 = out.cards.find((c) => c.id === 'c1')!
    expect(c1.question).toBe('What makes ATP?')
    expect(c1.answer).toBe('Mitochondria')
    const c2 = out.cards.find((c) => c.id === 'c2')!
    expect(c2.question).toBe('Powerhouse of the …')
    expect(c2.answer).toBe('Powerhouse of the cell')
  })

  it('list_cards filters by page', async () => {
    const { tools } = await setup()
    expect(
      (await tools.list_cards({ pageId: 'p2' })).cards.map((c) => c.id),
    ).toEqual(['c2'])
  })

  it('due_cards: due now, not suspended, not paused, not hidden', async () => {
    const { tools } = await setup()
    const out = await tools.due_cards({})
    expect(out.cards.map((c) => c.id)).toEqual(['c1'])
    expect(out.totalDue).toBe(1)
  })
})

describe('cache behaviour', () => {
  it('pulls only what changed since the last pull, and not more often than every 10 s', async () => {
    const { tools, source, advance } = await setup()
    await tools.list_notebooks()
    const first = source.pulls
    await tools.list_notebooks()
    expect(source.pulls).toBe(first)
    advance(11_000)
    await tools.list_notebooks()
    expect(source.pulls).toBeGreaterThan(first)
  })

  it('counts rows it cannot open (another key) and skips them', async () => {
    const { source, cache, tools } = await setup()
    const other = await createMasterKey()
    await source.put(
      'notebooks',
      {
        id: 'x',
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        title: 'X',
        order: 'z',
        allowAi: true,
      },
      other,
    )
    await tools.list_notebooks()
    expect(cache.unreadable).toBe(1)
  })

  it('a deleted notebook disappears', async () => {
    const { source, tools, advance } = await setup()
    await tools.list_notebooks()
    await source.put('notebooks', {
      id: 'nb1',
      createdAt: 1,
      updatedAt: 3,
      deletedAt: 3,
      title: 'Biology',
      order: 'a0',
      allowAi: true,
    })
    advance(11_000)
    expect((await tools.list_notebooks()).notebooks.map((n) => n.id)).toEqual([
      'nb3',
    ])
  })
})
