import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// The setup file by its path in this folder: in a working copy whose
// node_modules is a link to the main copy, the bare name resolved outside
// the folder and jsdom tests failed to start ("Cannot find module /@fs/...").
const fakeIndexedDb = fileURLToPath(
  new URL('./node_modules/fake-indexeddb/auto/index.mjs', import.meta.url),
)

// Vitest runs core logic (data model, storage, block operations) in Node.
// fake-indexeddb gives Dexie an in-memory IndexedDB, so tests need no browser.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    setupFiles: [fakeIndexedDb, './vitest.setup.ts'],
  },
})
