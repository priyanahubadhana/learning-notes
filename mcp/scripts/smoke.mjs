// MCP smoke test: starts the server (on fixture data) as a real child
// process over stdio and talks to it like Claude Desktop would.
//   npm run smoke               -> built-in check with the MCP SDK client
//   npm run smoke -- --inspector -> also runs the MCP Inspector CLI (downloads it once)
import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(mkdtempSync(join(tmpdir(), 'ln-mcp-smoke-')), 'server.mjs')
await build({
  entryPoints: [join(root, 'scripts/smokeServer.ts')],
  outfile: out,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  external: [
    'keytar',
    '@modelcontextprotocol/sdk',
    '@modelcontextprotocol/sdk/*',
    'zod',
  ],
  logLevel: 'error',
})
// The bundle sits in the temp folder, so point Node at the package's modules.
const env = { ...process.env, NODE_PATH: join(root, 'node_modules') }

let failed = false
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`)
  if (!ok) failed = true
}

// Copy next to the package so ESM resolves its imports.
import { copyFileSync, rmSync } from 'node:fs'
const local = join(root, 'dist-smoke.mjs')
copyFileSync(out, local)
try {
  const client = new Client({ name: 'smoke', version: '0' })
  await client.connect(
    new StdioClientTransport({ command: process.execPath, args: [local], env }),
  )
  const { tools } = await client.listTools()
  check(
    tools.length === 10,
    `10 tools listed (${tools.map((t) => t.name).join(', ')})`,
  )
  const text = (r) => r.content[0].text
  const nb = JSON.parse(
    text(await client.callTool({ name: 'list_notebooks', arguments: {} })),
  )
  check(
    nb.notebooks.length === 2,
    'list_notebooks returns the 2 readable notebooks',
  )
  const page = JSON.parse(
    text(
      await client.callTool({ name: 'read_page', arguments: { pageId: 'p1' } }),
    ),
  )
  check(
    page.markdown.includes('# The cell') && !!page.version,
    'read_page returns markdown + version',
  )
  const due = JSON.parse(
    text(await client.callTool({ name: 'due_cards', arguments: {} })),
  )
  check(due.cards.length === 1, 'due_cards returns the 1 due card')
  const hit = JSON.parse(
    text(
      await client.callTool({
        name: 'search_notes',
        arguments: { query: 'mitochondria' },
      }),
    ),
  )
  check(hit.results.length === 2, 'search_notes finds 2 pages')
  const added = JSON.parse(
    text(
      await client.callTool({
        name: 'append_to_page',
        arguments: {
          pageId: 'p1',
          markdown: '## Smoke\n\n- appended',
          expectedVersion: page.version,
        },
      }),
    ),
  )
  check(added.added.blocks === 2, 'append_to_page adds 2 blocks')
  const stale = await client.callTool({
    name: 'append_to_page',
    arguments: { pageId: 'p1', markdown: 'x', expectedVersion: page.version },
  })
  check(stale.isError === true, 'a stale version is refused')
  await client.close()

  if (process.argv.includes('--inspector')) {
    const r = spawnSync(
      'npx',
      [
        '-y',
        '@modelcontextprotocol/inspector',
        '--cli',
        'node',
        'dist-smoke.mjs',
        '--method',
        'tools/list',
      ],
      { encoding: 'utf8', shell: true, env, cwd: root },
    )
    check(
      r.status === 0 && r.stdout.includes('read_page'),
      'MCP Inspector CLI lists the tools',
    )
    if (r.status !== 0) console.log(r.stdout, r.stderr)
  }
} finally {
  rmSync(local, { force: true })
}
process.exit(failed ? 1 : 0)
