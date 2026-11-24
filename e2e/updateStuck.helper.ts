// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/** C22: a new worker that never finishes installing, and a reload that does nothing. */
export async function stuckRestart(page: Page) {
  await page.route('**/precache.json*', (r) =>
    r.fulfill({ json: { files: [] } }),
  )
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'First page')
  await page.evaluate(() => {
    const sw = navigator.serviceWorker
    const worker = {
      state: 'installing',
      onstatechange: null,
      postMessage: () => {},
    }
    Object.defineProperty(sw, 'getRegistration', {
      value: async () => ({ installing: worker, waiting: null }),
    })
    Object.defineProperty(sw, 'getRegistrations', {
      value: async () => [],
    })
  })
  // From here a reload does nothing: a reload that is ignored.
  await page.evaluate(() => {
    ;(window as never as { __lnIgnoreReload?: boolean }).__lnIgnoreReload = true
    window.dispatchEvent(
      new CustomEvent('learning-notes:test-update', {
        detail: { stuck: true },
      }),
    )
  })
}
