/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * SHOTS-only helper for gate 3 (Library v2, flag `library.v2`): the book
 * panel (reader's left panel and the library side panel with Recent filled)
 * and Knowledge with real highlights, at phone / iPad portrait / PC in day,
 * night and sepia. Run with SHOTS=after; without it the tests are skipped.
 */
const SHOTS = process.env.SHOTS
/** Fourth-visit pictures go to v4/before or v4/after. */
const DIR = SHOTS?.startsWith('v4') ? `v4/${SHOTS.slice(3)}` : 'after'
const SIZES = {
  pc: { width: 1180, height: 820 },
  ipadP: { width: 820, height: 1180 },
  phone: { width: 400, height: 820 },
}
const THEMES = ['day', 'night', 'sepia'] as const
const QUOTES: [string, string, string][] = [
  ['Alpha Book', 'yellow', 'Memory is strengthened each time you recall it.'],
  ['Alpha Book', 'blue', 'Spacing reviews over days beats one long session.'],
  ['Bravo Book', 'green', 'A question you ask yourself is worth ten you read.'],
  ['Bravo Book', 'yellow', 'Sleep turns the day into long-term memory.'],
  ['Alpha Book', 'pink', 'Explain an idea simply and you will know it well.'],
]

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

async function addHighlights(page: Page) {
  await page.evaluate(async (list) => {
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open('learning-notes')
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    const pages: { id: string; title: string }[] = await new Promise(
      (res, rej) => {
        const r = db.transaction('pages').objectStore('pages').getAll()
        r.onsuccess = () => res(r.result as { id: string; title: string }[])
        r.onerror = () => rej(r.error)
      },
    )
    const now = Date.now()
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('annotations', 'readwrite')
      list.forEach(([title, colour, text], i) => {
        const book = pages.find((p) => p.title === title)
        if (!book) throw new Error('book not found: ' + title)
        tx.objectStore('annotations').put({
          id: 'h-shot-' + i,
          createdAt: now - i * 3_600_000,
          updatedAt: now - i * 3_600_000,
          deletedAt: null,
          pageId: book.id,
          kind: 'highlight',
          colour,
          anchor: {
            type: 'pdf',
            page: 1 + (i % 3),
            rects: [0, 0.1, 0.5, 0.05],
          },
          quote: { exact: text, prefix: '', suffix: '' },
          origin: 'user',
        })
      })
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
    db.close()
  }, QUOTES)
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
    test.skip(!SHOTS || SHOTS.startsWith('v4'), 'pictures only')

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
