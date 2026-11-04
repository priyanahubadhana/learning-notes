// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * "↵ New line" can be tapped again and again: each tap adds an empty block and
 * puts the cursor in it, the bar stays visible and the button stays in the same
 * place. On the short bar (Touch and Pencil), in the ribbon and on the
 * floating bar. It is also in the default Write set, at the end.
 */

test.use({ viewport: { width: 1000, height: 1180 }, hasTouch: true })

async function openPage(
  page: Page,
  mode: 'touch' | 'pencil' = 'touch',
  keys: Record<string, unknown> = {},
) {
  await startInMode(page, mode)
  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem('learning-notes:' + key, JSON.stringify(value))
    }
  }, keys)
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const blocks = (page: Page) => page.locator('.bn-editor .bn-block')
const box = async (locator: Locator) => (await locator.boundingBox())!

/** Taps `button` three times: three new blocks, the button never moves or hides. */
async function tapThree(page: Page, button: Locator) {
  await expect(button).toBeVisible()
  await button.scrollIntoViewIfNeeded()
  const start = await blocks(page).count()
  const where = await box(button)
  for (let i = 1; i <= 3; i++) {
    await button.click()
    await expect(blocks(page)).toHaveCount(start + i)
    await expect(button).toBeVisible()
    const now = await box(button)
    expect(Math.abs(now.x - where.x), `tap ${i}: x`).toBeLessThan(1.5)
    expect(Math.abs(now.y - where.y), `tap ${i}: y`).toBeLessThan(1.5)
    await expect(dockedBar(page)).toBeVisible()
  }
  // The cursor is in the newest, empty block: typing lands there.
  await page.keyboard.type('end')
  await expect(blocks(page).last()).toContainText('end')
  await expect(blocks(page)).toHaveCount(start + 3)
}

for (const mode of ['touch', 'pencil'] as const) {
  test(`${mode} mode, short bar: tap New line 3 times in a row`, async ({
    page,
  }) => {
    await openPage(page, mode)
    await tapThree(
      page,
      dockedBar(page).getByRole('button', { name: 'New line', exact: true }),
    )
  })
}

test('New line is in the default Write set, at the end', async ({ page }) => {
  await openPage(page)
  const names = await dockedBar(page)
    .locator('[data-slot="tools"] [data-bar-btn]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-action')))
  expect(names.at(-1)).toBe('newLine')
  expect(names).toContain('more')
})

test('the ribbon: New line stays put and the tools stay open when it is used again and again', async ({
  page,
}) => {
  await openPage(page)
  await dockedBar(page)
    .getByRole('button', { name: 'All tools', exact: true })
    .click()
  await expect(dockedBar(page).getByRole('tabpanel')).toBeVisible()
  const newLine = dockedBar(page)
    .getByRole('tabpanel')
    .getByRole('button', { name: 'New line', exact: true })
  await tapThree(page, newLine)
  // The panel did not close after the taps (a repeated tool keeps it open).
  await expect(dockedBar(page).getByRole('tabpanel')).toBeVisible()
})

test('the floating bar: New line 3 times in a row', async ({ page }) => {
  await openPage(page, 'touch', { 'advanced.barPlacement': 'free' })
  await tapThree(
    page,
    dockedBar(page).getByRole('button', { name: 'New line', exact: true }),
  )
})

test('with "Ribbon + short bar" both New line buttons keep working', async ({
  page,
}) => {
  await openPage(page, 'touch', {
    'toolbar.ribbon': true,
    'toolbar.ribbonMode': 'both',
  })
  await tapThree(
    page,
    page
      .locator('[data-pill="short"]')
      .getByRole('button', { name: 'New line', exact: true }),
  )
})
