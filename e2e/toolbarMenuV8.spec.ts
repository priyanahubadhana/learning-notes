import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * 2A.2 on the new tool bar (toolbar.v8): its ⋯ card in the redesigned look
 * (flag toolbar.menu): tiles for the app actions and the tools that did not fit.
 */
test.use({ hasTouch: true })

const PRO = ['tb.textBox', 'tb.textFonts', 'tb.textMarks', 'tb.insertMore']
const PHONE = { width: 300, height: 700 }

async function open(page: Page, flags: string, size = PHONE) {
  await page.addInitScript(
    (u) =>
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'professional', unlocked: u }),
      ),
    [...PRO, 'tb.allTools'],
  )
  await page.setViewportSize(size)
  await startInMode(page, 'touch')
  await page.goto(`/?flags=${flags}`)
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const card = (page: Page) => page.getByTestId('v8-card-fold.bar')
const cardNames = (page: Page) =>
  card(page)
    .locator('button:not([data-testid="pcard-close"])')
    .evaluateAll((els) =>
      els
        .map(
          (e) =>
            e.getAttribute('aria-label') ??
            (e as HTMLElement).innerText.trim().split('\n')[0],
        )
        .filter(Boolean),
    )

test('switch OFF: the flat list stays', async ({ page }) => {
  await open(page, 'toolbar.v8')
  await page.getByTestId('v8-more').click()
  await expect(card(page)).toBeVisible()
  await expect(card(page).locator('[data-menu-v2]')).toHaveCount(0)
  await expect(page.getByTestId('v8-more-reading')).toBeVisible()
})

test('ON: app actions as one row of icon tiles, folded tools as a tile grid, nothing lost', async ({
  page,
}) => {
  await open(page, 'toolbar.v8')
  await page.getByTestId('v8-more').click()
  const old = await cardNames(page)
  expect(old.length).toBeGreaterThan(4)
  await page.getByTestId('pcard-close').click()
  await page.goto('/?flags=toolbar.v8,toolbar.menu')
  await page.getByTestId('v8-more').click()
  await expect(card(page).locator('[data-menu-v2]')).toBeVisible()
  // Settings and All tools sit under the Tool bar fold (2A.12).
  await card(page)
    .getByRole('button', { name: 'Tool bar', exact: true })
    .click()
  const now = await cardNames(page)
  for (const name of old) expect(now, name).toContain(name)
  const top = card(page).getByRole('group', { name: 'Tool bar' })
  await expect(top.getByRole('button')).toHaveCount(4)
  await expect(top.locator('svg')).toHaveCount(4)
  await expect(
    card(page).getByRole('group', { name: 'On this bar' }),
  ).toBeVisible()
  await expect(card(page).getByTestId('pcard-close')).toBeVisible()
})

test('every tile is at least 44 px and there are no key names', async ({
  page,
}) => {
  await open(page, 'toolbar.v8,toolbar.menu')
  await page.getByTestId('v8-more').click()
  await expect(card(page).locator('.pcard-tile').first()).toBeVisible()
  const sizes = await card(page)
    .locator('.pcard-tile')
    .evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect()
        return Math.min(r.width, r.height)
      }),
    )
  expect(sizes.length).toBeGreaterThan(6)
  for (const s of sizes) expect(s).toBeGreaterThanOrEqual(43.5)
  expect(await card(page).innerText()).not.toMatch(/⌘|Ctrl\+|Shift\+/)
})

test('a tap opens the card with no focus ring; Tab rings the first tile', async ({
  page,
}) => {
  await open(page, 'toolbar.v8,toolbar.menu')
  await page.getByTestId('v8-more').click()
  await expect(card(page)).toBeVisible()
  await expect(card(page).locator('.pcard-tile').first()).toBeVisible()
  const ringed = () =>
    page.evaluate(() => {
      const el = document.activeElement
      if (!el) return false
      const css = getComputedStyle(el)
      return css.outlineStyle !== 'none' && parseFloat(css.outlineWidth) > 0
    })
  expect(await ringed()).toBe(false)
  await page.keyboard.press('Tab')
  await expect(card(page).locator('.pcard-tile').first()).toBeFocused()
  expect(await ringed()).toBe(true)
})

test('2A.12: New line stays on the bar (never a ⋯ tile) and adds a line', async ({
  page,
}) => {
  await open(page, 'toolbar.v8,toolbar.menu')
  const blocks = page.locator('.bn-block')
  const before = await blocks.count()
  await page.getByTestId('v8-more').click()
  await expect(page.getByTestId('v8-fold-nl')).toHaveCount(0)
  await page.getByTestId('pcard-close').click()
  await page.getByTestId('v8-newline').click()
  await expect.poll(() => blocks.count()).toBeGreaterThan(before)
})

test('a tile runs its action: Hide the tool bar closes the card and the bar', async ({
  page,
}) => {
  await open(page, 'toolbar.v8,toolbar.menu')
  await page.getByTestId('v8-more').click()
  await page.getByTestId('v8-more-hide').click()
  await expect(card(page)).toHaveCount(0)
})

test('shell ON: the card has exactly one scroll bar, the shared one', async ({
  page,
}) => {
  await open(page, 'toolbar.v8,toolbar.menu,foundation.shell', {
    width: 300,
    height: 380,
  })
  await page.getByTestId('v8-more').click()
  await expect(card(page)).toBeVisible()
  await expect(page.getByTestId('pcard-track')).toHaveCount(0)
  await expect(page.locator('.sbar')).toHaveCount(1)
})
