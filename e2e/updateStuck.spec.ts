// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import { stuckRestart } from './updateStuck.helper.ts'

/**
 * C22 (owner, 16 Nov): an update restart never stays stuck without a word.
 * The new worker never finishes installing and the reload does not take the
 * page away (a test switch makes it do nothing). After 5 s the notice offers
 * "Restart now"; a reload that is ignored twice shows "Couldn't restart".
 */
const label = (page: Page) =>
  page.evaluate(
    () => document.querySelector('[data-restart-now]')?.textContent ?? '',
  )

test('C22 stuck restart: Restart now appears, and a reload ignored twice is shown', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await stuckRestart(page)
  await expect.poll(() => label(page), { timeout: 25_000 }).toBe('Restart now')
  await page.evaluate(() =>
    (document.querySelector('[data-restart-now]') as HTMLElement).click(),
  )
  // Reload asked, ignored; asked again with a fresh address, ignored: told.
  await expect
    .poll(() => label(page), { timeout: 30_000 })
    .toBe("Couldn't restart. Tap to try again")
  const h = await page.evaluate(
    () =>
      document.querySelector('[data-restart-now]')!.getBoundingClientRect()
        .height,
  )
  expect(h).toBeGreaterThanOrEqual(44)
})
