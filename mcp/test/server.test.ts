import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, it } from 'vitest'
import { NotesCache } from '../src/cache'
import { buildServer } from '../src/server'
import { makeTools } from '../src/tools'
import { makeWriteTools } from '../src/writeTools'
import type { Scopes } from '../src/config'
import { newFixture, seedNotes } from './fixture'

async function connect() {
  const { master, source } = await newFixture()
  await seedNotes(source, 1_000_000)
  const tools = makeTools(new NotesCache(source, master), () => 1_000_000)
  const [a, b] = InMemoryTransport.createLinkedPair()
  const server = buildServer(tools)
  const client = new Client({ name: 'test', version: '0' })
  await Promise.all([server.connect(a), client.connect(b)])
  return client
}

const text = (r: unknown) =>
  (r as { content: { text: string }[] }).content[0].text

describe('MCP server over the protocol', () => {
  it('offers exactly the six read-only tools', async () => {
    const client = await connect()
    const { tools } = await client.listTools()
    expect(tools.map((x) => x.name).sort()).toEqual([
      'due_cards',
      'list_cards',
      'list_notebooks',
      'list_pages',
      'read_page',
      'search_notes',
    ])
    for (const tool of tools) expect(tool.annotations?.readOnlyHint).toBe(true)
  })

  it('calls a tool', async () => {
    const client = await connect()
    const r = await client.callTool({
      name: 'read_page',
      arguments: { pageId: 'p1' },
    })
    expect(JSON.parse(text(r)).markdown).toContain('# The cell')
  })

  it('returns a plain error for a page Claude may not read', async () => {
    const client = await connect()
    const r = await client.callTool({
      name: 'read_page',
      arguments: { pageId: 'p3' },
    })
    expect((r as { isError?: boolean }).isError).toBe(true)
    expect(text(r)).toMatch(/may not read/)
  })

  it('rejects bad inputs', async () => {
    const client = await connect()
    const r = await client
      .callTool({ name: 'search_notes', arguments: { query: '' } })
      .catch((e: unknown) => e)
    const failed = r instanceof Error || (r as { isError?: boolean }).isError
    expect(failed).toBe(true)
  })
})

describe('tool list follows the scopes', () => {
  async function list(scopes: Scopes) {
    const { master, source } = await newFixture()
    await seedNotes(source, 1_000_000)
    const cache = new NotesCache(source, master)
    const write = makeWriteTools({
      cache,
      source,
      master,
      deviceId: 'mcp-t',
      scopes,
    })
    const [a, b] = InMemoryTransport.createLinkedPair()
    const server = buildServer(makeTools(cache), { write, scopes })
    const client = new Client({ name: 'test', version: '0' })
    await Promise.all([server.connect(a), client.connect(b)])
    return (await client.listTools()).tools.map((x) => x.name).sort()
  }
  const reads = [
    'due_cards',
    'list_cards',
    'list_notebooks',
    'list_pages',
    'read_page',
    'search_notes',
  ]

  it('all on: reads plus four writes, and no delete or edit tool', async () => {
    const names = await list({
      read: true,
      'write:append': true,
      'write:create': true,
    })
    expect(names).toEqual(
      [
        ...reads,
        'add_cards',
        'add_page',
        'append_to_page',
        'create_notebook',
      ].sort(),
    )
    expect(names.some((n) => /delete|remove|edit|replace/.test(n))).toBe(false)
  })

  it('each switch removes only its own tools', async () => {
    expect(
      await list({ read: true, 'write:append': false, 'write:create': false }),
    ).toEqual(reads)
    expect(
      await list({ read: true, 'write:append': true, 'write:create': false }),
    ).toEqual([...reads, 'add_cards', 'append_to_page'].sort())
    expect(
      await list({ read: false, 'write:append': false, 'write:create': true }),
    ).toEqual(['add_page', 'create_notebook'])
  })

  it('a write tool over the protocol saves and answers in JSON', async () => {
    const { master, source } = await newFixture()
    await seedNotes(source, 1_000_000)
    const scopes: Scopes = {
      read: true,
      'write:append': true,
      'write:create': true,
    }
    const cache = new NotesCache(source, master)
    const write = makeWriteTools({
      cache,
      source,
      master,
      deviceId: 'mcp-t',
      scopes,
    })
    const [a, b] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test', version: '0' })
    await Promise.all([
      buildServer(makeTools(cache), { write, scopes }).connect(a),
      client.connect(b),
    ])
    const r = await client.callTool({
      name: 'add_page',
      arguments: {
        notebookId: 'nb1',
        page: { title: 'New', blocks: [{ type: 'paragraph', text: 'hi' }] },
      },
    })
    expect(JSON.parse(text(r)).pages).toBe(1)
    const bad = await client.callTool({
      name: 'add_page',
      arguments: {
        notebookId: 'nb2',
        page: { title: 'N', blocks: [{ type: 'paragraph', text: 'x' }] },
      },
    })
    expect((bad as { isError?: boolean }).isError).toBe(true)
  })
})
