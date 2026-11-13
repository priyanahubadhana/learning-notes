/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Slice 7e/7g (reader v2): the left panel's tab row (RD-B34, RD-B35) and the
 * default pen bar style Full (RD-B43). Flag reader.v2 via ?flags=reader.v2.
 */
test.use({ viewport: { width: 1200, height: 900 } })

async function openPdf(page: Page) {
  await page.goto('/?flags=reader.v2')
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
}

const panel = (page: Page) => page.getByTestId('left-panel')
const tabNames = async (page: Page) =>
  (await panel(page).getByRole('tab').allInnerTexts()).map((s) => s.trim())

async function openPanel(page: Page) {
  const hide = page.getByRole('button', { name: 'Hide menu' })
  if (await hide.isVisible()) await hide.click()
  await page.getByTestId('panel-toggle').click()
  await expect(panel(page)).toBeVisible()
}

test('RD-B34 the panel has Pages, Outline, Notes and a +; Audio waits under the +; nothing is dimmed', async ({
  page,
}) => {
  await openPdf(page)
  await openPanel(page)
  await expect.poll(() => tabNames(page)).toEqual(['Pages', 'Outline', 'Notes'])
  await expect(page.getByTestId('tabrow-plus')).toBeVisible()
  // One line.
  const tops = await panel(page)
    .getByRole('tab')
    .evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().top)),
    )
  expect(new Set(tops).size).toBe(1)
  await page.getByTestId('tabrow-plus').click()
  await expect(
    page.getByRole('menuitem', { name: 'Add a tab: Audio' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  // No dim layer behind the panel: no full-screen dark layer is on screen.
  const dark = await page.evaluate(() =>
    Array.from(document.querySelectorAll('body *')).some((el) => {
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return (
        s.position === 'fixed' &&
        r.width >= window.innerWidth - 1 &&
        r.height >= window.innerHeight - 1 &&
        /rgba\(0, 0, 0, 0\.[1-9]/.test(s.backgroundColor)
      )
    }),
  )
  expect(dark).toBe(false)
})

test('RD-B35 + opens Edit tabs: add Audio, rename, reorder, remove; every dialog has a close cross; kept after reload', async ({
  page,
}) => {
  await openPdf(page)
  await openPanel(page)
  await page.getByTestId('tabrow-plus').click()
  await page.getByRole('menuitem', { name: 'Add a tab: Audio' }).click()
  await expect
    .poll(() => tabNames(page))
    .toEqual(['Pages', 'Outline', 'Notes', 'Audio'])
  await page.getByTestId('tabrow-plus').click()
  await page.getByTestId('tabrow-edit').click()
  const editor = page.getByTestId('tab-editor')
  await expect(editor).toBeVisible()
  await expect(page.getByTestId('sheet-close')).toBeVisible()
  // The reader bar waits while the sheet is open, so it never covers the sheet's title or cross.
  await expect(page.getByTestId('rv2-stack')).toHaveClass(/rv2-stack--away/)
  // Rename the first tab.
  const first = page.getByTestId('tabed-row').first().getByRole('textbox')
  await first.fill('Thumbnails')
  await first.press('Enter')
  // Move Audio up (the arrow buttons), then remove Outline.
  await page.getByRole('button', { name: 'Move Audio up' }).click()
  await page.getByRole('button', { name: 'Remove Outline' }).click()
  await page.getByTestId('tabed-done').click()
  await expect(editor).toHaveCount(0)
  await expect(page.getByTestId('rv2-stack')).not.toHaveClass(/rv2-stack--away/)
  await expect
    .poll(() => tabNames(page))
    .toEqual(['Thumbnails', 'Audio', 'Notes'])
  // The choice is a setting: it stays after a reload.
  await page.reload()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  if (!(await panel(page).isVisible())) await openPanel(page)
  await expect
    .poll(() => tabNames(page))
    .toEqual(['Thumbnails', 'Audio', 'Notes'])
  // The cross closes the dialog too.
  await page.getByTestId('tabrow-plus').click()
  await page.getByTestId('tabrow-edit').click()
  await page.getByTestId('sheet-close').click()
  await expect(page.getByTestId('tab-editor')).toHaveCount(0)
})

test('RD-B43 the pen bar style is Full for a new reader, the other styles stay pickable', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-more').click()
  const row = (name: string) =>
    page
      .locator('.pcard-row')
      .filter({ hasText: new RegExp(`^Pen bar: ${name}$`) })
  await expect(row('Full')).toHaveAttribute('aria-pressed', 'true')
  await expect(row('Compact')).toHaveAttribute('aria-pressed', 'false')
  await expect(row('Simple')).toHaveAttribute('aria-pressed', 'false')
})
