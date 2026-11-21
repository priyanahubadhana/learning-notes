// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { sidebar } from './helpers.ts'

/**
 * B11: on a phone the drawer's rows never move sideways while it opens. The
 * list reserved its scroll gutter (24 px) only after it had measured that it
 * overflowed, so the rows (and the ⋯ buttons) jumped 24 px left a moment after
 * the drawer was open and a tap on ⋯ could land beside the button.
 */
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
})

test('B11 the drawer rows and their ⋯ do not move while it opens', async ({
  page,
}) => {
  await page.goto('/')
  const side = sidebar(page)
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(side).toBeVisible()
  await page.getByRole('button', { name: 'Open today’s journal' }).tap()
  await expect.poll(() => page.url()).toContain('#/page/')
  await expect(side).toBeHidden()
  // The month row is made a moment after the page (slow in WebKit): wait for it.
  await expect(
    page.locator('aside [aria-label="More for November 2026"]'),
  ).toBeAttached()
  // From the tap on Open menu, once per frame for 600 ms: where the ⋯ of the
  // month row is inside the drawer, and how wide the row is.
  const seen = await page.evaluate(
    () =>
      new Promise<string[]>((done) => {
        const out: string[] = []
        const t0 = performance.now()
        document
          .querySelector<HTMLElement>('button[aria-label="Open menu"]')!
          .click()
        const tick = () => {
          const more = document.querySelector<HTMLElement>(
            'aside [aria-label="More for November 2026"]',
          )
          const aside = document.querySelector('aside')!
          if (more) {
            const row = more.closest('div.group')!
            out.push(
              Math.round(
                more.getBoundingClientRect().x -
                  aside.getBoundingClientRect().x,
              ) +
                '/' +
                Math.round(row.getBoundingClientRect().width),
            )
          }
          if (performance.now() - t0 < 600) requestAnimationFrame(tick)
          else done(out)
        }
        tick()
      }),
  )
  expect(seen.length).toBeGreaterThan(10)
  expect(
    [...new Set(seen)],
    'x in the drawer / row width, per frame',
  ).toHaveLength(1)
})
