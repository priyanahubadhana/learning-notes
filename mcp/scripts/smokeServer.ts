// A copy of the real server wired to fake (but really encrypted) fixture
// data, for the smoke test. Never shipped.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { NotesCache } from '../src/cache'
import { buildServer } from '../src/server'
import { makeTools } from '../src/tools'
import { makeWriteTools } from '../src/writeTools'
import { newFixture, seedNotes } from '../test/fixture'

const { master, source } = await newFixture()
await seedNotes(source, Date.now())
const cache = new NotesCache(source, master)
const scopes = { read: true, 'write:append': true, 'write:create': true }
const write = makeWriteTools({
  cache,
  source,
  master,
  deviceId: 'mcp-smoke',
  scopes,
})
const server = buildServer(makeTools(cache), { write, scopes })
await server.connect(new StdioServerTransport())
