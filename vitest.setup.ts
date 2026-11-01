import { afterAll } from 'vitest'

// Editors in jsdom tests leave a short timer running; let it finish before
// the test environment closes, or it fails on a missing `document`.
afterAll(() => new Promise((done) => setTimeout(done, 100)))
