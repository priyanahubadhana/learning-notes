/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Slice 7 (reader v2) phone and iPad portrait: the floating reader bar must
 * not cover or clip anything in the left panel (its tab row, the first Pages
 * chip). The panel overlays the reader on these screens; the bar steps aside
 * while it is open and returns when it closes.
 */
const SIZES = [
  ['phone 390', 390, 844],
  ['iPad portrait 820', 820, 1180],
] as const

async function openBook(page: Page) {
  await page.goto('/?flags=reader.v2')
  const menu = page.getByRole('button', { name: 'Open menu' })
  if (await menu.isVisible()) await menu.click()
  await page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: 'Space: Library' })
    .click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'fixture.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(
      Array.from({ length: 4 }, (_, i) => `Page ${i + 1} words here`),
      { title: 'Fixture Book' },
    ),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(page.locator('[data-bars-ready]')).toHaveCount(1)
  const hide = page.getByRole('button', { name: 'Hide menu' })
  if (await hide.isVisible()) await hide.click()
}

/** True when the element at the middle of `loc` is `loc` itself (or inside it). */
const onTop = (loc: ReturnType<Page['locator']>) =>
  loc.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return (
      !!hit &&
      el.contains(hit) &&
      r.x >= 0 &&
      r.x + r.width <= window.innerWidth + 0.5
    )
  })

for (const [name, w, h] of SIZES) {
  test(`the reader bar never covers or clips the left panel: ${name}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: w, height: h })
    await openBook(page)
    const stack = page.getByTestId('rv2-stack')
    await expect(stack).not.toHaveClass(/rv2-stack--away/)
    await page.getByTestId('panel-toggle').click()
    await expect(page.getByTestId('left-panel')).toBeVisible()
    // The bar stays (✕ Exit reading in reach); the panel starts below it.
    await expect(stack).not.toHaveClass(/rv2-stack--away/)
    await expect(page.getByTestId('reader-close')).toBeVisible()
    expect(await onTop(page.getByTestId('reader-close'))).toBe(true)
    const barBox = await stack.boundingBox()
    const tabBox = await page
      .getByTestId('left-panel')
      .getByRole('tab')
      .first()
      .boundingBox()
    expect(barBox && tabBox && tabBox.y >= barBox.y + barBox.height).toBe(true)
    if (process.env.SHOTS) {
      await page.waitForTimeout(700)
      await page.screenshot({
        path: `docs/mockups/reader-v2-build-shots/7g-panel-${w}.png`,
      })
    }
    // Every tab, and the first Pages chip, is the topmost thing where it sits.
    const tabs = page.getByTestId('left-panel').getByRole('tab')
    const count = await tabs.count()
    expect(count).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < count; i++) expect(await onTop(tabs.nth(i))).toBe(true)
    await expect(page.getByTestId('pg-list')).toBeVisible()
    const chip = page.getByTestId('pg-list').getByRole('button').first()
    await expect(chip).toBeVisible()
    expect(await onTop(chip)).toBe(true)
    // Closing the panel brings the bar back.
    const close = page.getByRole('button', { name: 'Close panel' })
    expect(await onTop(close)).toBe(true)
    await close.click()
    await expect(page.getByTestId('left-panel')).toHaveCount(0)
    await expect(stack).not.toHaveClass(/rv2-stack--away/)
  })
}
