/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Slice 6 gate-3 fixes (third visit, items 1 to 6). Set SHOTS=before or
 * SHOTS=after to also save pictures under screenshots/gate3-6/.
 */
const SHOTS = process.env.SHOTS
const SIZES = {
  pc: { width: 1180, height: 820 },
  ipadP: { width: 820, height: 1180 },
  phone: { width: 400, height: 820 },
}
const THEMES = ['day', 'night', 'sepia'] as const

const main = (page: Page) => page.getByRole('main')

async function openSpace(
  page: Page,
  space: 'library' | 'home',
  heading: string,
  opts: { hideSidebar?: boolean; level?: string } = {},
) {
  await page.addInitScript(
    ([hide, level]) => {
      try {
        if (hide)
          localStorage.setItem(
            'learning-notes:sidebarHidden',
            JSON.stringify(true),
          )
        if (level && !localStorage.getItem('learning-notes:level'))
          localStorage.setItem(
            'learning-notes:level',
            JSON.stringify({ level, unlocked: [] }),
          )
      } catch {
        // storage blocked
      }
    },
    [!!opts.hideSidebar, opts.level ?? 'beginner'] as const,
  )
  await page.goto('/?flags=library.v2')
  await expect(async () => {
    const el = page.locator(`[data-space="${space}"]`)
    if ((await el.getAttribute('aria-current')) !== 'page') await el.click()
    await expect(
      main(page).getByRole('heading', { name: heading }),
    ).toBeVisible({ timeout: 3000 })
  }).toPass({ timeout: 20_000 })
}

async function addBook(page: Page, title: string) {
  await page.getByTestId('library-file').setInputFiles({
    name: `${title}.pdf`,
    mimeType: 'application/pdf',
    buffer: makePdf(['Alpha page words', 'Bravo page words'], { title }),
  })
  await expect(
    page.getByTestId('source-card').filter({ hasText: title }),
  ).toBeVisible()
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return
  for (const th of THEMES) {
    await page.evaluate(
      (v) => document.documentElement.setAttribute('data-theme', v),
      th,
    )
    await page.waitForTimeout(150)
    await page.screenshot({
      path: `screenshots/gate3-6/${SHOTS}/${name}-${th}.png`,
    })
  }
}

test.describe('Library v2 gate 3 (third visit)', () => {
  test('G6-1 search is a Lucide icon in a 44 pt target, not a typed character', async ({
    page,
  }) => {
    await page.setViewportSize(SIZES.pc)
    await openSpace(page, 'library', 'Library')
    await shot(page, '1-search-icon')
    const b = page.getByTestId('library-search-button')
    await expect(b.locator('svg')).toHaveCount(1)
    expect(((await b.textContent()) ?? '').trim()).toBe('')
    const box = (await b.boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
  })

  test('G6-2 More has a sliders icon and Add a Lucide plus', async ({
    page,
  }) => {
    await page.setViewportSize(SIZES.pc)
    await openSpace(page, 'library', 'Library')
    await shot(page, '2-more-add-icons')
    const more = page.getByTestId('library-more-button')
    await expect(more.locator('svg')).toHaveCount(1)
    await expect(more).toHaveText('More')
    const add = page.getByTestId('library-add')
    await expect(add.locator('svg')).toHaveCount(1)
    await expect(add).toHaveText('Add')
  })

  test('G6-3 iPad portrait: shelf button hides while the panel is open; phone keeps it', async ({
    page,
  }) => {
    await page.setViewportSize(SIZES.ipadP)
    await openSpace(page, 'library', 'Library')
    await shot(page, '3-ipad-portrait-panel-open')
    await expect(page.getByTestId('library-panel')).toBeVisible()
    await expect(page.getByTestId('shelf-button')).toHaveCount(0)
    await page.setViewportSize(SIZES.phone)
    await expect(page.getByTestId('shelf-button')).toBeVisible()
  })

  test('G6-3b panel closed on a wide screen: the shelf button shows', async ({
    page,
  }) => {
    await page.setViewportSize(SIZES.ipadP)
    await openSpace(page, 'library', 'Library', { hideSidebar: true })
    await expect(page.getByTestId('library-panel')).toBeHidden()
    await expect(page.getByTestId('shelf-button')).toBeVisible()
    await shot(page, '3-ipad-portrait-panel-closed')
  })

  for (const [name, size] of Object.entries(SIZES)) {
    test(`G6-4 one page title style and padding: Library = Home (${name})`, async ({
      page,
    }) => {
      await page.setViewportSize(size)
      const style = () =>
        main(page)
          .locator('h1, h2')
          .first()
          .evaluate((h) => {
            const c = getComputedStyle(h)
            const root = h.closest(
              '[data-testid="library"], [data-testid="home-screen"]',
            )!
            const r = getComputedStyle(root)
            return [c.fontSize, c.fontWeight, r.paddingLeft, r.paddingTop]
          })
      await openSpace(page, 'home', 'Home')
      const home = await style()
      await shot(page, `4-title-home-${name}`)
      await page.locator('[data-space="library"]').click()
      await expect(
        main(page).getByRole('heading', { name: 'Library' }),
      ).toBeVisible()
      await shot(page, `4-title-library-${name}`)
      const lib = await style()
      expect(lib).toEqual(home)
    })
  }

  test('G6-5 the side panel says "Nothing yet." for an empty Recent', async ({
    page,
  }) => {
    await page.setViewportSize(SIZES.pc)
    await openSpace(page, 'library', 'Library')
    await shot(page, '5-recent-empty')
    await expect(page.getByTestId('panel-recent-empty')).toHaveText(
      'Nothing yet.',
    )
  })

  // Pictures with books: only when SHOTS is set (the picture run).
  for (const level of SHOTS ? ['beginner', 'professional'] : []) {
    for (const [name, size] of Object.entries(SIZES)) {
      test(`G6-6 pictures with books (${level}, ${name})`, async ({ page }) => {
        test.setTimeout(180_000)
        await page.setViewportSize(size)
        await openSpace(page, 'library', 'Library', { level })
        await addBook(page, 'Alpha Book')
        await addBook(page, 'Bravo Book')
        const tag = `6-${name}-${level}`
        await shot(page, `${tag}-books`)
        await page.getByTestId('source-start').first().click()
        await expect(page.getByTestId('book-reader')).toBeVisible()
        await page.getByTestId('reader-close').click()
        await page.locator('[data-space="library"]').click()
        await expect(page.getByTestId('continue-block')).toBeVisible()
        await shot(page, `${tag}-continue-reading`)
        await page.getByTestId('library-add').click()
        await shot(page, `${tag}-add-menu`)
        await page.keyboard.press('Escape')
        await page.getByTestId('library-more-button').click()
        await shot(page, `${tag}-more-sheet`)
        await page.keyboard.press('Escape')
        await page.getByTestId('library-more-button').click()
        await page.getByRole('tab', { name: 'View' }).click()
        await page.getByRole('radio', { name: 'List' }).click()
        await page.getByTestId('more-done').click()
        await expect(page.getByTestId('library-list')).toBeVisible()
        await shot(page, `${tag}-list-view`)
        await page.getByTestId('library-search-button').click()
        await shot(page, `${tag}-search`)
        await page.getByTestId('library-search-button').click()
        await page.getByTestId('tab-knowledge').click()
        await shot(page, `${tag}-knowledge`)
      })
    }
  }
})
