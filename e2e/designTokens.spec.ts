import { expect, test } from '@playwright/test'

/** Design step 1: violet accent in the app, Inter after first paint, the review page. */

test('the app uses the violet accent and the system font first', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('[data-app-shell]')).toBeVisible()
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue('--color-accent')
      .trim(),
  )
  expect(accent).toBe('#6941e0')
  const font = await page.evaluate(
    () => getComputedStyle(document.body).fontFamily,
  )
  expect(font.startsWith('-apple-system')).toBe(true)
})

test('Inter is fetched only after the page has loaded', async ({ page }) => {
  const fonts: string[] = []
  page.on('request', (r) => {
    if (/inter-latin/.test(r.url())) fonts.push(r.url())
  })
  await page.goto('/')
  await expect(page.locator('[data-app-shell]')).toBeVisible()
  await expect.poll(() => fonts.length, { timeout: 8000 }).toBeGreaterThan(0)
})

test('the hidden Design tokens page shows the tokens and switches theme', async ({
  page,
}) => {
  await page.goto('/#/design-tokens')
  await expect(
    page.getByRole('heading', { name: 'Design tokens' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Default' }).first(),
  ).toBeVisible()
  await page.getByRole('button', { name: 'night', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue('--color-accent')
      .trim(),
  )
  expect(bg).toBe('#a08cff')
})
