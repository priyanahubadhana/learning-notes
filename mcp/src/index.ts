import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { sessionKeeper } from './auth'
import { NotesCache } from './cache'
import { loadMaster } from './keys'
import { openSecretStore } from './secrets'
import { buildServer } from './server'
import { runLogout, runSetup, runStatus } from './setup'
import { supabaseSource } from './source'
import { makeTools } from './tools'

// stdout belongs to the MCP protocol: everything we say goes to stderr.
const log = (s: string) => process.stderr.write(`[learning-notes-mcp] ${s}\n`)

async function serve(): Promise<void> {
  const store = await openSecretStore()
  const master = await loadMaster(store)
  if (!master) {
    log('Not set up yet. Run: node mcp/dist/index.js setup')
    process.exitCode = 1
    return
  }
  const keeper = sessionKeeper(store)
  const source = supabaseSource(() => keeper.accessToken())
  const cache = new NotesCache(source, master, {
    readAll: process.env.LN_MCP_READ_ALL === '1',
  })
  const server = buildServer(makeTools(cache))
  await server.connect(new StdioServerTransport())
  log('Ready (read-only).')
}

const [cmd, ...rest] = process.argv.slice(2)
const run =
  cmd === 'setup'
    ? runSetup(rest)
    : cmd === 'status'
      ? runStatus()
      : cmd === 'logout'
        ? runLogout()
        : cmd === undefined || cmd === 'serve'
          ? serve()
          : Promise.resolve(
              void log(
                `Unknown command "${cmd}". Use: setup | status | logout | serve`,
              ),
            )

run.catch((e: unknown) => {
  log(`Stopped: ${e instanceof Error ? e.message : 'unknown problem'}`)
  process.exitCode = 1
})
