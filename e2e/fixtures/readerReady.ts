import { expect, test as base } from '@playwright/test'

/**
 * Reader v2 specs: wait once for the app to be ready after each page load,
 * instead of lengthening every click. WebKit needs ~15 s to start the app on
 * a cold page (about 600 small database writes), so the first wait is long and
 * every later click keeps the normal limit. "Ready" = the Spaces rail (wide
 * screens) or the Open menu button (narrow ones) is on the page.
 */
export const READY_MS = 60_000

export const test = base.extend({
  page: async ({ page }, run) => {
    const goto = page.goto.bind(page)
    page.goto = (async (...args: Parameters<typeof goto>) => {
      const res = await goto(...args)
      await expect(
        page
          .getByRole('navigation', { name: 'Spaces' })
          .or(page.getByRole('button', { name: 'Open menu' }))
          .first(),
      ).toBeAttached({ timeout: READY_MS })
      return res
    }) as typeof page.goto
    await run(page)
  },
})

export { expect }
