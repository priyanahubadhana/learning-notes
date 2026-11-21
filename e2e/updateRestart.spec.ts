// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * P1.10 (owner bug T27): a restart that has to wait for a new version still
 * installing ends in a reload, never back at "Update ready". The saved-copy
 * clean-up never ends here (as behind a 10 MB install), so only waiting for
 * the worker can restart the page.
 */
test('T27 a worker still installing: the forced restart waits for it, then reloads', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await page.route('**/precache.json*', (r) =>
    r.fulfill({ json: { files: [] } }),
  )
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'First page')
  await page.evaluate(() => {
    const w = window as never as { __same?: number }
    w.__same = 1
    const sw = navigator.serviceWorker
    const worker = {
      state: 'installing',
      onstatechange: null as null | (() => void),
      postMessage: () => {},
    }
    Object.defineProperty(sw, 'getRegistration', {
      value: async () => ({ installing: worker, waiting: null }),
    })
    Object.defineProperty(sw, 'getRegistrations', {
      value: () => new Promise(() => {}),
    })
    // The install ends 9 s from now, after the forced restart began (6 s).
    setTimeout(() => {
      worker.state = 'activated'
      worker.onstatechange?.()
    }, 9_000)
  })
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('learning-notes:test-required-update', { detail: null }),
    ),
  )
  await page.waitForTimeout(8_000)
  // Still waiting for the install: no reload yet.
  expect(
    await page.evaluate(() => (window as never as { __same?: number }).__same),
  ).toBe(1)
  await expect
    .poll(
      () =>
        page
          .evaluate(
            () => (window as never as { __same?: number }).__same ?? 'gone',
          )
          .catch(() => 'reloading'),
      { timeout: 20_000 },
    )
    .not.toBe(1)
})
