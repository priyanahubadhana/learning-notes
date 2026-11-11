// A copy of the real server wired to fake (but really encrypted) fixture
// data, for the smoke test. Never shipped.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { NotesCache } from '../src/cache'
import { buildServer } from '../src/server'
import { makeTools } from '../src/tools'
import { newFixture, seedNotes } from '../test/fixture'

const { master, source } = await newFixture()
await seedNotes(source, Date.now())
const server = buildServer(makeTools(new NotesCache(source, master)))
await server.connect(new StdioServerTransport())
