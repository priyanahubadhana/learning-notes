import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, it } from 'vitest'
import { NotesCache } from '../src/cache'
import { buildServer } from '../src/server'
import { makeTools } from '../src/tools'
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
