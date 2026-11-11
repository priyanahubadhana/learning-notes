import { afterAll } from 'vitest'
import { enLate } from './src/i18n/en/late'
import { setMessages } from './src/i18n/t'

// Editors in jsdom tests leave a short timer running; let it finish before
// the test environment closes, or it fails on a missing `document`.
afterAll(() => new Promise((done) => setTimeout(done, 100)))

// The English texts of later features are loaded by the app at start-up.
setMessages('en', enLate)
