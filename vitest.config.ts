import { defineConfig } from 'vitest/config'

// Vitest runs core logic (data model, storage, block operations) in Node.
// fake-indexeddb gives Dexie an in-memory IndexedDB, so tests need no browser.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['fake-indexeddb/auto', './vitest.setup.ts'],
  },
})
