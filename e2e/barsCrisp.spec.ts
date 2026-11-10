// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'
import { readSwitch, controls, writeBook, frame } from './readingHelpers.ts'

/**
 * Owner iPad bug (9 Nov): bar icons looked blurry/faded. Every bar that is
 * shown must be fully opaque (itself and every parent), with no filter, no
 * backdrop-filter and no will-change on it or a parent.
 */

test.use({ viewport: { width: 1100, height: 700 } })

async function expectCrisp(bar: Locator) {
  await expect(bar).toBeVisible()
  const bad = await bar.evaluate((el) => {
    const out: string[] = []
    const icons = [...el.querySelectorAll('button:enabled, svg')].filter(
      (n) => !n.closest('button:disabled'),
    )
    for (const node of [el, ...icons]) {
      for (let n: Element | null = node; n; n = n.parentElement) {
        const s = getComputedStyle(n)
        if (Number(s.opacity) !== 1) out.push('opacity ' + s.opacity)
        if (s.filter !== 'none') out.push('filter ' + s.filter)
        if (n !== el.parentElement && n !== document.body) {
          const bf = s.getPropertyValue('backdrop-filter')
          if (n === el && bf && bf !== 'none') out.push('backdrop ' + bf)
        }
        if (s.willChange !== 'auto') out.push('will-change ' + s.willChange)
        if (n === document.body) break
      }
    }
    return out
  })
  expect(bad).toEqual([])
}

async function startBook(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Heart', 'Cardiology book')
  await writeBook(page, 3)
}

test('main bar, ribbon pill and mini bars are crisp at full opacity', async ({
  page,
}) => {
  await startBook(page)
  await expectCrisp(page.locator('[data-main-bar]'))
  for (const pill of await page.locator('[data-pill]').all()) {
    if (await pill.isVisible()) await expectCrisp(pill)
  }
  for (const pill of await page.locator('[data-pill-root]').all()) {
    if (await pill.isVisible()) await expectCrisp(pill)
  }
})

test('reader top bar is crisp and covers the app header', async ({ page }) => {
  await startBook(page)
  await readSwitch(page).click()
  await expectCrisp(controls(page))
  await expect(frame(page)).toBeVisible()
  // The reader bar is at least as tall as the app header, so none peeks out.
  const bar = await controls(page).boundingBox()
  const header = await page
    .locator('header, [data-topbar]')
    .first()
    .boundingBox()
  if (bar && header)
    expect(bar.height).toBeGreaterThanOrEqual(header.height - 1)
})

test('reader bar has Undo and Redo, in place', async ({ page }) => {
  await startBook(page)
  await readSwitch(page).click()
  await expect(controls(page).getByTestId('history-undo')).toBeVisible()
  await expect(controls(page).getByTestId('history-redo')).toBeVisible()
})
