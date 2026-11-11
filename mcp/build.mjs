// Bundles src/index.ts (and the app's shared sync code it imports) into one
// file: dist/index.js. The MCP SDK, zod and keytar stay as normal packages.
import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
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
  banner: { js: '#!/usr/bin/env node' },
  logLevel: 'info',
})
