/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'
import { addHighlights } from './fixtures/highlights.ts'

/**
 * SHOTS-only helper for gate 3 (Library v2, flag `library.v2`): the book
 * panel (reader's left panel and the library side panel with Recent filled)
 * and Knowledge with real highlights, at phone / iPad portrait / PC in day,
 * night and sepia. Run with SHOTS=after; without it the tests are skipped.
 */
const SHOTS = process.env.SHOTS
/** Fourth-visit pictures go to v4/before or v4/after. */
const DIR = SHOTS?.startsWith('v4')
  ? `v4/${SHOTS.slice(3)}`
  : SHOTS === 'v6'
    ? 'v6'
    : 'after'
const SIZES = {
  pc: { width: 1180, height: 820 },
  ipadP: { width: 820, height: 1180 },
  phone: { width: 400, height: 820 },
}
const THEMES = ['day', 'night', 'sepia'] as const
async function shot(page: Page, name: string) {
  for (const th of THEMES) {
    await page.evaluate(
      (v) => document.documentElement.setAttribute('data-theme', v),
      th,
    )
    await page.waitForTimeout(150)
    await page.screenshot({
      path: `screenshots/gate3-6/${DIR}/${name}-${th}.png`,
    })
  }
}

async function addBook(page: Page, title: string) {
  await page.getByTestId('library-file').setInputFiles({
    name: `${title}.pdf`,
    mimeType: 'application/pdf',
    buffer: makePdf(['Alpha page words', 'Bravo page words', 'Charlie page'], {
      title,
    }),
  })
  await expect(
    page.getByTestId('source-card').filter({ hasText: title }),
  ).toBeVisible()
}

async function openLibrary(page: Page, level: string) {
  await page.addInitScript((lv) => {
    try {
      if (!localStorage.getItem('learning-notes:level'))
        localStorage.setItem(
          'learning-notes:level',
          JSON.stringify({ level: lv, unlocked: [] }),
        )
    } catch {
      // storage blocked
    }
  }, level)
  await page.goto('/?flags=library.v2')
  await expect(async () => {
    const el = page.locator('[data-space="library"]')
    if ((await el.getAttribute('aria-current')) !== 'page') await el.click()
    await expect(
      page.getByRole('main').getByRole('heading', { name: 'Library' }),
    ).toBeVisible({ timeout: 3000 })
  }).toPass({ timeout: 20_000 })
}

for (const [size, vp] of Object.entries(SIZES)) {
  test.describe(`library shots ${size}`, () => {
    test.skip(
      !SHOTS || SHOTS.startsWith('v4') || SHOTS === 'v6',
      'pictures only',
    )

    test('book panel and Knowledge with highlights', async ({ page }) => {
      test.setTimeout(180_000)
      await page.setViewportSize(vp)
      await openLibrary(page, 'professional')
      await addBook(page, 'Alpha Book')
      await addBook(page, 'Bravo Book')
      await addHighlights(page)
      // The reader, then its left panel (pages) and the Notes tab.
      await page.getByTestId('source-start').first().click()
      await expect(page.getByTestId('book-reader')).toBeVisible()
      await page.getByTestId('panel-toggle').click()
      await expect(page.getByTestId('left-panel')).toBeVisible()
      await expect(page.getByTestId('book-thumb')).not.toHaveCount(0)
      await page.waitForTimeout(500)
      await shot(page, `7-book-panel-pages-${size}`)
      await page
        .getByTestId('left-panel')
        .getByRole('tab', { name: 'Notes' })
        .click()
      await page.waitForTimeout(300)
      await shot(page, `7-book-panel-notes-${size}`)
      await page
        .getByTestId('left-panel')
        .getByRole('button', { name: 'Close panel' })
        .click()
      await expect(page.getByTestId('left-panel')).toBeHidden()
      await page.getByTestId('reader-close').click()
      await page.locator('[data-space="library"]').click()
      await expect(page.getByTestId('continue-block')).toBeVisible()
      await shot(page, `7-library-after-reading-${size}`)
      await page.getByTestId('tab-knowledge').click()
      await expect(page.getByTestId('highlight-row')).toHaveCount(5)
      await shot(page, `8-knowledge-highlights-${size}`)
      await page.getByTestId('highlight-row').first().click()
      await expect(page.getByTestId('highlight-preview')).toBeVisible()
      await shot(page, `8-knowledge-preview-${size}`)
    })
  })
}

/** Gate 3 fourth visit (slice 6): one picture per fix, SHOTS=v4-before|v4-after. */
for (const [size, vp] of Object.entries(SIZES)) {
  test.describe(`library v4 shots ${size}`, () => {
    test.skip(!SHOTS?.startsWith('v4'), 'pictures only')

    test('fixes 1-5', async ({ page }) => {
      test.setTimeout(240_000)
      await page.setViewportSize(vp)
      await openLibrary(page, 'professional')
      await addBook(page, 'Alpha Book')
      // Fix 5: the toast right after adding, above the tab bar.
      await addBook(page, 'Bravo Book')
      await shot(page, `5-toast-${size}`)
      await expect(page.locator('[data-toast]')).toBeHidden({ timeout: 15_000 })
      await addHighlights(page)
      // Fixes 1 and 3: Books filter row and tab row.
      await shot(page, `1-3-books-filters-tabs-${size}`)
      // Fix 2: Knowledge filters.
      await page.getByTestId('tab-knowledge').click()
      await expect(page.getByTestId('highlight-row')).toHaveCount(5)
      await shot(page, `2-knowledge-filters-${size}`)
      await page.getByTestId('tab-books').click()
      // Fix 4: the book panel.
      await page.getByTestId('source-start').first().click()
      await expect(page.getByTestId('book-reader')).toBeVisible()
      await page.getByTestId('panel-toggle').click()
      await expect(page.getByTestId('left-panel')).toBeVisible()
      await page.waitForTimeout(600)
      await shot(page, `4-book-panel-${size}`)
    })
  })
}

/** Gate 3 fifth visit (slice 6): one picture set per fix, SHOTS=v6. No tip:
 * the mouse rests on an empty spot before each picture. */
const V6 = { ...SIZES, ipadL: { width: 1180, height: 820 } }
for (const [size, vp] of Object.entries(V6)) {
  test.describe(`library v6 shots ${size}`, () => {
    test.skip(SHOTS !== 'v6', 'pictures only')

    test('fifth-visit fixes 1-4', async ({ page }) => {
      test.setTimeout(240_000)
      await page.setViewportSize(vp)
      await openLibrary(page, 'professional')
      const rest = () => page.mouse.move(vp.width - 4, vp.height / 2)
      await addBook(page, 'Alpha Book')
      await addBook(page, 'Bravo Book')
      await rest()
      // Fix 4: the toast with no tip on it.
      await shot(page, `4-toast-no-tip-${size}`)
      await expect(page.locator('[data-toast]')).toBeHidden({ timeout: 15_000 })
      await shot(page, `4-books-no-tip-${size}`)
      await addHighlights(page)
      await page.getByTestId('tab-knowledge').click()
      await expect(page.getByTestId('highlight-row')).toHaveCount(5)
      await rest()
      // Fixes 1 and 2: full-width cards; filters with one Colour chip.
      await shot(page, `1-2-knowledge-${size}`)
      await page.getByTestId('know-colour').click()
      await shot(page, `2-colour-menu-${size}`)
      await page.getByRole('menuitemradio', { name: 'Yellow' }).click()
      await expect(page.getByTestId('highlight-row')).toHaveCount(2)
      await rest()
      await shot(page, `2-colour-chosen-${size}`)
      await page.getByTestId('highlight-row').first().click()
      await expect(page.getByTestId('highlight-preview')).toBeVisible()
      await rest()
      await shot(page, `1-knowledge-preview-${size}`)
      // Fix 3: the book panel with the whole window dimmed but the top bar.
      await page.getByTestId('tab-books').click()
      await page.getByTestId('source-start').first().click()
      await expect(page.getByTestId('book-reader')).toBeVisible()
      await page.getByTestId('panel-toggle').click()
      await expect(page.getByTestId('left-panel')).toBeVisible()
      await rest()
      await page.waitForTimeout(600)
      await shot(page, `3-book-panel-${size}`)
    })
  })
}
